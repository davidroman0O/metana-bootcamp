// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPriceFeed.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFV2PlusWrapper.sol";
import "./interfaces/IUniswapV2Router.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

/**
 * @title UpgradableSpinTester
 * @dev Upgradeable version of the SpinTester contract with proper VRF integration
 * We implement our own VRF consumer functionality instead of inheriting from VRFV2PlusWrapperConsumerBase
 * because the base contract uses immutable variables which are not compatible with upgradeable contracts
 */
contract UpgradableSpinTester is 
    Initializable, 
    OwnableUpgradeable, 
    UUPSUpgradeable
{
    // External contracts
    IPriceFeed public ethUsdPriceFeed;
    IPriceFeed public linkUsdPriceFeed;
    LinkTokenInterface public linkToken;
    IUniswapV2Router public uniswapRouter;
    IVRFV2PlusWrapper public vrfWrapper;
    
    // VRF parameters
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;
    uint256 public vrfCostLINK;
    uint256 public vrfCostETH;
    
    // Economic parameters
    uint256 public baseChipPriceUSD;
    uint256 public maxSlippageBPS;
    uint256 public houseEdge;
    
    // VRF request tracking
    struct RequestStatus {
        bool fulfilled;
        uint256[] randomWords;
        uint256 paid;
        bool nativePayment;
        address requester;
        uint256 timestamp;
    }
    mapping(uint256 => RequestStatus) public requests;
    uint256 public lastRequestId;
    
    // Events to track test results
    event TestCompleted(string testName, bool success, string result);
    event RandomWordsRequested(uint256 requestId, uint256 paid, bool nativePayment);
    event RandomWordsFulfilled(uint256 requestId, uint256[] randomWords);
    event ETHReceived(uint256 amount);
    
    /**
     * @dev Constructor disables initializers to prevent direct deployment
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initializes the contract with the provided parameters
     */
    function initialize(
        address _ethUsdPriceFeed,
        address _linkUsdPriceFeed,
        address _linkToken,
        address _vrfWrapper,
        address _uniswapRouter
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        // Set contract addresses
        ethUsdPriceFeed = IPriceFeed(_ethUsdPriceFeed);
        linkUsdPriceFeed = IPriceFeed(_linkUsdPriceFeed);
        linkToken = LinkTokenInterface(_linkToken);
        vrfWrapper = IVRFV2PlusWrapper(_vrfWrapper);
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
        
        // Set default parameters
        callbackGasLimit = 500000;
        requestConfirmations = 3;
        numWords = 1;
        vrfCostLINK = 1 ether; // 1.0 LINK for VRF request (reduced from 2.5)
        vrfCostETH = 0.002 ether; // 0.002 ETH for VRF request (~$6.40)
        
        baseChipPriceUSD = 20; // $0.20 in cents
        maxSlippageBPS = 300; // 3% max slippage
        houseEdge = 500; // 5%
    }
    
    // Authorization for upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    // Receive function to accept ETH
    receive() external payable {
        emit ETHReceived(msg.value);
    }
    
    /**
     * @dev Internal function to request random words with LINK payment
     */
    function _requestRandomWordsWithLINK() external returns (uint256 requestId, uint256 price) {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        );
        
        // Direct call for LINK payment - following the exact pattern from SpinTester.sol
        price = vrfWrapper.calculateRequestPrice(callbackGasLimit, numWords);
        
        // If price is zero, use vrfCostLINK or a small non-zero amount
        if (price == 0) {
            price = vrfCostLINK > 0 ? vrfCostLINK : 0.0001 ether;
        }
        
        // Make sure we have enough LINK
        require(linkToken.balanceOf(address(this)) >= price, "Insufficient LINK balance");
        
        // Approve LINK transfer
        linkToken.approve(address(vrfWrapper), price);
        
        // Transfer LINK and call the wrapper
        linkToken.transferAndCall(
            address(vrfWrapper),
            price,
            abi.encode(callbackGasLimit, requestConfirmations, numWords, extraArgs)
        );
        
        requestId = vrfWrapper.lastRequestId();
        return (requestId, price);
    }
    
    /**
     * @dev Internal function to request random words with ETH payment
     */
    function _requestRandomWordsWithETH() external payable returns (uint256 requestId, uint256 price) {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );
        
        price = vrfWrapper.calculateRequestPriceNative(callbackGasLimit, numWords);
        
        // Make sure we have enough ETH
        require(msg.value >= price, "Insufficient ETH sent");
        
        // Call the wrapper with ETH
        requestId = vrfWrapper.requestRandomWordsInNative{value: msg.value}(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
        
        return (requestId, price);
    }
    
    /**
     * @dev Callback function used by VRF Coordinator
     */
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal {
        require(requests[_requestId].paid > 0, "Request not found");
        
        requests[_requestId].fulfilled = true;
        requests[_requestId].randomWords = _randomWords;
        
        emit RandomWordsFulfilled(_requestId, _randomWords);
    }
    
    /**
     * @dev External callback function called by the VRF Wrapper
     */
    function rawFulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) external {
        // We need to check that the caller is the VRF wrapper
        require(msg.sender == address(vrfWrapper), "Only VRF wrapper can fulfill");
        fulfillRandomWords(_requestId, _randomWords);
    }
    
    // TEST 1: Price Feed Connection
    function test_PriceFeeds() external returns (bool success, int256 ethPrice, int256 linkPrice) {
        try ethUsdPriceFeed.latestRoundData() returns (
            uint80, // roundId
            int256 _ethPrice,
            uint256, // startedAt
            uint256, // updatedAt
            uint80 // answeredInRound
        ) {
            try linkUsdPriceFeed.latestRoundData() returns (
                uint80,
                int256 _linkPrice,
                uint256,
                uint256,
                uint80
            ) {
                bool isValid = _ethPrice > 0 && _linkPrice > 0;
                emit TestCompleted(
                    "PriceFeeds", 
                    isValid, 
                    string(abi.encodePacked(
                        "ETH: ", 
                        _uint2str(uint256(_ethPrice)), 
                        ", LINK: ", 
                        _uint2str(uint256(_linkPrice))
                    ))
                );
                return (isValid, _ethPrice, _linkPrice);
            } catch Error(string memory reason) {
                emit TestCompleted("PriceFeeds", false, string(abi.encodePacked("LINK feed error: ", reason)));
                return (false, _ethPrice, 0);
            }
        } catch Error(string memory reason) {
            emit TestCompleted("PriceFeeds", false, string(abi.encodePacked("ETH feed error: ", reason)));
            return (false, 0, 0);
        }
    }
    
    // TEST 2: VRF Cost Calculation
    function test_VRFCostInUSD() external returns (bool success, uint256 vrfCostUSD) {
        try this.getLINKCostInUSD() returns (uint256 _vrfCostUSD) {
            emit TestCompleted("VRFCostInUSD", _vrfCostUSD > 0, _uint2str(_vrfCostUSD));
            return (_vrfCostUSD > 0, _vrfCostUSD);
        } catch Error(string memory reason) {
            emit TestCompleted("VRFCostInUSD", false, reason);
            return (false, 0);
        }
    }
    
    // TEST 3: USD to ETH conversion
    function test_USDtoETHConversion(uint256 usdCents) external returns (bool success, uint256 ethAmount) {
        try this.convertUSDCentsToETH(usdCents) returns (uint256 _ethAmount) {
            emit TestCompleted("USDtoETHConversion", _ethAmount > 0, _uint2str(_ethAmount));
            return (_ethAmount > 0, _ethAmount);
        } catch Error(string memory reason) {
            emit TestCompleted("USDtoETHConversion", false, reason);
            return (false, 0);
        }
    }
    
    // TEST 4: ETH to LINK swap
    function test_ETHtoLINKSwap(uint256 ethAmount) external payable returns (bool success, uint256 linkReceived) {
        require(address(this).balance >= ethAmount, "Insufficient ETH balance");
        
        uint256 initialLinkBalance = linkToken.balanceOf(address(this));
        
        try this.swapETHForLINK(ethAmount) returns (uint256 _linkReceived) {
            uint256 finalLinkBalance = linkToken.balanceOf(address(this));
            bool received = finalLinkBalance > initialLinkBalance;
            
            emit TestCompleted(
                "ETHtoLINKSwap",
                received,
                string(abi.encodePacked(
                    "ETH spent: ",
                    _uint2str(ethAmount),
                    ", LINK received: ",
                    _uint2str(_linkReceived)
                ))
            );
            
            return (received, _linkReceived);
        } catch Error(string memory reason) {
            emit TestCompleted("ETHtoLINKSwap", false, string(abi.encodePacked("Swap failed: ", reason)));
            return (false, 0);
        }
    }
    
    // TEST 5A: VRF Request with LINK payment
    function test_VRFRequestWithLINK() external returns (bool success, uint256 requestId) {
        uint256 linkBalance = linkToken.balanceOf(address(this));
        
        if (linkBalance < vrfCostLINK) {
            emit TestCompleted("VRFRequestWithLINK", false, "Insufficient LINK balance");
            return (false, 0);
        }
        
        try this._requestRandomWordsWithLINK() returns (uint256 _requestId, uint256 _price) {
            lastRequestId = _requestId;
            requests[_requestId] = RequestStatus({
                fulfilled: false,
                randomWords: new uint256[](0),
                paid: _price,
                nativePayment: false,
                requester: msg.sender,
                timestamp: block.timestamp
            });
            
            emit RandomWordsRequested(_requestId, _price, false);
            emit TestCompleted("VRFRequestWithLINK", true, string(abi.encodePacked("RequestId: ", _uint2str(_requestId), ", Cost: ", _uint2str(_price))));
            return (true, _requestId);
        } catch Error(string memory reason) {
            emit TestCompleted("VRFRequestWithLINK", false, string(abi.encodePacked("VRF request failed: ", reason)));
            return (false, 0);
        }
    }
    
    // TEST 5B: VRF Request with Native ETH payment
    function test_VRFRequestWithETH() external payable returns (bool success, uint256 requestId) {
        if (address(this).balance < vrfCostETH) {
            emit TestCompleted("VRFRequestWithETH", false, "Insufficient ETH balance");
            return (false, 0);
        }
        
        try this._requestRandomWordsWithETH{value: vrfCostETH}() returns (uint256 _requestId, uint256 _price) {
            lastRequestId = _requestId;
            requests[_requestId] = RequestStatus({
                fulfilled: false,
                randomWords: new uint256[](0),
                paid: _price,
                nativePayment: true,
                requester: msg.sender,
                timestamp: block.timestamp
            });
            
            emit RandomWordsRequested(_requestId, _price, true);
            emit TestCompleted("VRFRequestWithETH", true, string(abi.encodePacked("RequestId: ", _uint2str(_requestId), ", Cost: ", _uint2str(_price))));
            return (true, _requestId);
        } catch Error(string memory reason) {
            emit TestCompleted("VRFRequestWithETH", false, string(abi.encodePacked("VRF request failed: ", reason)));
            return (false, 0);
        }
    }
    
    // TEST 6: Full Spin Flow Test with LINK payment
    function test_FullSpinFlow(uint8 reelCount) external payable returns (bool success, string memory failurePoint, uint256 requestId) {
        // Step 1-2: Calculate spin cost and ETH value
        (bool costSuccess, uint256 ethValue, uint256 spinCost) = _calculateSpinCostAndETH(reelCount);
        if (!costSuccess) {
            return (false, "Spin cost calculation failed", 0);
        }
        
        // Check if contract has enough ETH
        if (address(this).balance < ethValue) {
            return (false, "Insufficient ETH balance", 0);
        }
        
        // Step 3-5: Calculate VRF cost and ETH for LINK
        (bool vrfSuccess, uint256 ethForLINK) = _calculateVRFCostAndETHForLINK(ethValue);
        if (!vrfSuccess) {
            return (false, "VRF cost calculation failed", 0);
        }
        
        // Step 6: Swap ETH for LINK
        (bool swapSuccess, uint256 linkReceived) = _swapETHForLINK(ethForLINK);
        if (!swapSuccess) {
            return (false, "ETH to LINK swap failed", 0);
        }
        
        // Step 7: Calculate prize pool contribution
        uint256 remainingETH = ethValue - ethForLINK;
        uint256 houseAmount = (remainingETH * houseEdge) / 10000;
        uint256 prizePoolAmount = remainingETH - houseAmount;
        
        // Step 8: Make VRF request with LINK payment
        (bool requestSuccess, uint256 _requestId, uint256 _price) = _makeVRFRequestWithLINK();
        if (!requestSuccess) {
            return (false, "VRF request failed", 0);
        }
        
        // All steps succeeded
        emit TestCompleted(
            "FullSpinFlow", 
            true, 
            string(abi.encodePacked(
                "SpinCost: ", _uint2str(spinCost),
                ", ETH: ", _uint2str(ethValue),
                ", LINK: ", _uint2str(linkReceived),
                ", Prize: ", _uint2str(prizePoolAmount),
                ", RequestId: ", _uint2str(_requestId)
            ))
        );
        
        return (true, "All steps succeeded", _requestId);
    }
    
    // Helper functions remain the same...
    function _calculateSpinCostAndETH(uint8 reelCount) internal returns (bool success, uint256 ethValue, uint256 spinCost) {
        spinCost = getSpinCost(reelCount);
        if (spinCost == 0) {
            return (false, 0, 0);
        }
        
        ethValue = calculateETHFromCHIPS(spinCost);
        if (ethValue == 0) {
            return (false, 0, spinCost);
        }
        
        return (true, ethValue, spinCost);
    }
    
    function _calculateVRFCostAndETHForLINK(uint256 ethValue) internal returns (bool success, uint256 ethForLINK) {
        uint256 vrfCostUSD;
        try this.getLINKCostInUSD() returns (uint256 _vrfCostUSD) {
            vrfCostUSD = _vrfCostUSD;
            if (vrfCostUSD == 0) {
                return (false, 0);
            }
        } catch {
            return (false, 0);
        }
        
        uint256 vrfCostInETH;
        try this.convertUSDCentsToETH(vrfCostUSD) returns (uint256 _vrfCostETH) {
            vrfCostInETH = _vrfCostETH;
            if (vrfCostInETH == 0) {
                return (false, 0);
            }
        } catch {
            return (false, 0);
        }
        
        if (vrfCostInETH <= ethValue) {
            ethForLINK = vrfCostInETH;
        } else {
            ethForLINK = (ethValue * 10) / 100; // 10% of ethValue
            if (ethForLINK < 1000) {
                ethForLINK = 1000;
            }
        }
        
        if (ethForLINK == 0) {
            return (false, 0);
        }
        
        return (true, ethForLINK);
    }
    
    function _swapETHForLINK(uint256 ethForLINK) internal returns (bool success, uint256 linkReceived) {
        try this.swapETHForLINK(ethForLINK) returns (uint256 _linkReceived) {
            linkReceived = _linkReceived;
            if (linkReceived == 0) {
                return (false, 0);
            }
            return (true, linkReceived);
        } catch {
            return (false, 0);
        }
    }
    
    function _makeVRFRequestWithLINK() internal returns (bool success, uint256 _requestId, uint256 _price) {
        try this._requestRandomWordsWithLINK() returns (uint256 reqId, uint256 reqPrice) {
            _requestId = reqId;
            _price = reqPrice;
            
            lastRequestId = _requestId;
            requests[_requestId] = RequestStatus({
                fulfilled: false,
                randomWords: new uint256[](0),
                paid: _price,
                nativePayment: false,
                requester: msg.sender,
                timestamp: block.timestamp
            });
            
            emit RandomWordsRequested(_requestId, _price, false);
            return (true, _requestId, _price);
        } catch {
            return (false, 0, 0);
        }
    }
    
    // Economic calculation functions
    function getLINKCostInUSD() external view returns (uint256) {
        (, int256 linkPriceUSD, , uint256 updatedAt, ) = linkUsdPriceFeed.latestRoundData();
        
        require(linkPriceUSD > 0, "Invalid LINK price");
        if (block.chainid != 31337) {
            require(block.timestamp - updatedAt <= 3600*24, "LINK price data stale");
        }
        require(uint256(linkPriceUSD) >= 1 * 1e8, "LINK price too low");
        require(uint256(linkPriceUSD) <= 1000 * 1e8, "LINK price too high");
        
        uint256 vrfCostUSDCents = (vrfCostLINK * uint256(linkPriceUSD) * 125) / (1e18 * 1e8);
        
        return vrfCostUSDCents;
    }
    
    function convertUSDCentsToETH(uint256 usdCents) external view returns (uint256) {
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        require(ethPriceUSD > 0, "Invalid ETH price");
        if (block.chainid == 1) {
            require(block.timestamp - updatedAt <= 3600*24, "ETH price data stale");
        }
        
        uint256 ethValue = (usdCents * 1e18 * 1e8) / (uint256(ethPriceUSD) * 100);
        
        return ethValue;
    }
    
    function swapETHForLINK(uint256 ethAmountToSpend) external returns (uint256 linkReceived) {
        require(ethAmountToSpend > 0, "ETH amount zero");
        require(address(this).balance >= ethAmountToSpend, "Insufficient ETH");
        require(address(uniswapRouter) != address(0), "Router zero");
        require(address(linkToken) != address(0), "LINK zero");
        
        uint256 initialLINKBalance = linkToken.balanceOf(address(this));
        
        address[] memory path = new address[](2);
        path[0] = uniswapRouter.WETH();
        path[1] = address(linkToken);
        
        uint256[] memory amountsOut = uniswapRouter.getAmountsOut(ethAmountToSpend, path);
        uint256 minLinkOut = amountsOut[1] * (10000 - maxSlippageBPS) / 10000;
        
        try uniswapRouter.swapExactETHForTokens{value: ethAmountToSpend}(
            minLinkOut,
            path,
            address(this),
            block.timestamp + 300
        ) returns (uint256[] memory amounts) {
            linkReceived = amounts[1];
        } catch {
            uint256[] memory amounts = uniswapRouter.swapExactETHForTokens{value: ethAmountToSpend}(
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            linkReceived = amounts[1];
        }
        
        require(linkReceived > 0, "Swap failed");
        require(linkToken.balanceOf(address(this)) > initialLINKBalance, "No LINK increase");
        
        return linkReceived;
    }
    
    function getSpinCost(uint8 reelCount) public view returns (uint256) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        uint256 baseCostUSD = baseChipPriceUSD;
        
        uint256 vrfCostUSD;
        try this.getLINKCostInUSD() returns (uint256 _vrfCostUSD) {
            vrfCostUSD = _vrfCostUSD;
        } catch {
            return 0;
        }
        
        uint256 totalBaseCostUSD = baseCostUSD + vrfCostUSD;
        uint256 reelMultiplier = getReelMultiplier(reelCount);
        uint256 scaledCostUSD = (totalBaseCostUSD * reelMultiplier) / 10000;
        uint256 costInCHIPS = (scaledCostUSD * 5 * 1e18) / 100;
        
        return costInCHIPS;
    }
    
    function getReelMultiplier(uint8 reelCount) public pure returns (uint256) {
        if (reelCount == 3) return 10000;
        if (reelCount == 4) return 25000;
        if (reelCount == 5) return 75000;
        if (reelCount == 6) return 200000;
        if (reelCount == 7) return 500000;
        revert("Invalid reel count");
    }
    
    function calculateETHFromCHIPS(uint256 chipsAmount) public view returns (uint256) {
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        require(ethPriceUSD > 0, "Invalid ETH price");
        if (block.chainid == 1) {
            require(block.timestamp - updatedAt <= 3600*24, "ETH price data stale");
        }
        
        uint256 ethValue = (chipsAmount * baseChipPriceUSD * 1e8) / (uint256(ethPriceUSD) * 100);
        
        return ethValue;
    }
    
    // Admin functions
    function withdrawLINK(uint256 amount) external onlyOwner {
        require(linkToken.transfer(owner(), amount), "Transfer failed");
    }
    
    function withdrawETH(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
    }
    
    // Utility functions
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    function getVRFResult(uint256 _requestId) external view returns (
        bool fulfilled, 
        uint256[] memory randomWords, 
        uint256 paid, 
        bool nativePayment,
        address requester,
        uint256 timestamp
    ) {
        return (
            requests[_requestId].fulfilled,
            requests[_requestId].randomWords,
            requests[_requestId].paid,
            requests[_requestId].nativePayment,
            requests[_requestId].requester,
            requests[_requestId].timestamp
        );
    }
    
    // Update VRF parameters (only owner)
    function updateVRFParameters(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        uint256 _vrfCostLINK,
        uint256 _vrfCostETH
    ) external onlyOwner {
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
        vrfCostLINK = _vrfCostLINK;
        vrfCostETH = _vrfCostETH;
    }
    
    // Approve LINK tokens for a spender (needed for VRF)
    function approveLINK(address spender, uint256 amount) external onlyOwner {
        linkToken.approve(spender, amount);
    }
} 