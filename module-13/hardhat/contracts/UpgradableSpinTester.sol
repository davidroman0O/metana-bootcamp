// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPriceFeed.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/IVRFV2PlusWrapper.sol";

/**
 * @title UpgradableSpinTester
 * @dev Upgradeable version of the SpinTester contract
 * Implements VRF consumer functionality directly instead of inheriting
 */
contract UpgradableSpinTester is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // External contracts
    IPriceFeed public ethUsdPriceFeed;
    IPriceFeed public linkUsdPriceFeed;
    IERC20 public linkToken;
    IUniswapV2Router public uniswapRouter;
    IVRFV2PlusWrapper public vrfWrapper;
    
    // VRF parameters
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;
    uint256 public vrfCostLINK;
    
    // Economic parameters
    uint256 public baseChipPriceUSD;
    uint256 public maxSlippageBPS;
    uint256 public houseEdge;
    
    // VRF request tracking
    struct RequestStatus {
        bool fulfilled;
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public requests;
    uint256 public lastRequestId;
    
    // Events to track test results
    event TestCompleted(string testName, bool success, string details);
    event ETHReceived(uint256 amount);
    event RandomWordsRequested(uint256 indexed requestId, uint256 paid);
    event RandomWordsFulfilled(uint256 indexed requestId, uint256[] randomWords);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
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
        linkToken = IERC20(_linkToken);
        vrfWrapper = IVRFV2PlusWrapper(_vrfWrapper);
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
        
        // Set default parameters
        callbackGasLimit = 200000;
        requestConfirmations = 3;
        numWords = 1;
        vrfCostLINK = 0.01 ether; // 0.01 LINK
        
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
        // Check if the contract has enough ETH
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
    
    // TEST 5: Direct VRF Request - Implemented directly using the VRF wrapper
    function test_VRFRequest() external returns (bool success, uint256 requestId) {
        // Check if the contract has enough LINK
        uint256 linkBalance = linkToken.balanceOf(address(this));
        
        if (linkBalance < vrfCostLINK) {
            emit TestCompleted("VRFRequest", false, "Insufficient LINK balance");
            return (false, 0);
        }
        
        // Approve LINK transfer to the VRF wrapper
        linkToken.approve(address(vrfWrapper), vrfCostLINK);
        
        // Make direct VRF request with LINK payment
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        );
        
        // Request randomness directly from the wrapper
        (uint256 _requestId, uint256 _price) = vrfWrapper.requestRandomWords(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
            
        lastRequestId = _requestId;
        requests[_requestId] = RequestStatus({
            fulfilled: false,
            randomWords: new uint256[](0)
        });
        
        emit RandomWordsRequested(_requestId, _price);
        emit TestCompleted("VRFRequest", true, _uint2str(_requestId));
        return (true, _requestId);
    }
    
    // VRF callback function - called by the VRF Wrapper
    function rawFulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) external {
        // Only the VRF Wrapper can call this function
        require(msg.sender == address(vrfWrapper), "Only VRF wrapper can fulfill");
        fulfillRandomWords(_requestId, _randomWords);
    }
    
    // Internal function to handle VRF fulfillment
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal {
        require(requests[_requestId].fulfilled == false, "Request already fulfilled");
        requests[_requestId].fulfilled = true;
        requests[_requestId].randomWords = _randomWords;
        
        emit RandomWordsFulfilled(_requestId, _randomWords);
        emit TestCompleted(
            "VRFCallback", 
            true, 
            string(abi.encodePacked(
                "Request ID: ", 
                _uint2str(_requestId), 
                " | Random value: ", 
                _uint2str(_randomWords[0])
            ))
        );
    }
    
    // TEST 6: Full Spin Flow Test
    function test_FullSpinFlow(uint8 reelCount) external payable returns (bool success, string memory failurePoint) {
        // Step 1: Calculate spin cost
        uint256 spinCost = getSpinCost(reelCount);
        if (spinCost == 0) {
            return (false, "Spin cost calculation failed");
        }
        
        // Step 2: Calculate ETH value of cost
        uint256 ethValue = calculateETHFromCHIPS(spinCost);
        if (ethValue == 0) {
            return (false, "ETH calculation failed");
        }
        
        // Check if contract has enough ETH
        if (address(this).balance < ethValue) {
            return (false, "Insufficient ETH balance");
        }
        
        // Step 3: Calculate VRF cost
        uint256 vrfCostUSD;
        try this.getLINKCostInUSD() returns (uint256 _vrfCostUSD) {
            vrfCostUSD = _vrfCostUSD;
            if (vrfCostUSD == 0) {
                return (false, "VRF cost calculation failed");
            }
        } catch {
            return (false, "VRF cost calculation error");
        }
        
        // Step 4: Convert VRF cost to ETH
        uint256 vrfCostETH;
        try this.convertUSDCentsToETH(vrfCostUSD) returns (uint256 _vrfCostETH) {
            vrfCostETH = _vrfCostETH;
            if (vrfCostETH == 0) {
                return (false, "VRF cost ETH conversion failed");
            }
        } catch {
            return (false, "VRF cost ETH conversion error");
        }
        
        // Step 5: Calculate ETH for LINK purchase
        uint256 ethForLINK;
        if (vrfCostETH <= ethValue) {
            ethForLINK = vrfCostETH;
        } else {
            ethForLINK = (ethValue * 10) / 100; // 10% of ethValue
            if (ethForLINK < 1000) {
                ethForLINK = 1000;
            }
        }
        
        if (ethForLINK == 0) {
            return (false, "ETH for LINK calculation failed");
        }
        
        // Step 6: Swap ETH for LINK
        uint256 linkReceived;
        try this.swapETHForLINK(ethForLINK) returns (uint256 _linkReceived) {
            linkReceived = _linkReceived;
            if (linkReceived == 0) {
                return (false, "ETH to LINK swap failed");
            }
        } catch {
            return (false, "ETH to LINK swap error");
        }
        
        // Step 7: Calculate prize pool contribution
        uint256 remainingETH = ethValue - ethForLINK;
        uint256 houseAmount = (remainingETH * houseEdge) / 10000;
        uint256 prizePoolAmount = remainingETH - houseAmount;
        
        // All steps succeeded
        emit TestCompleted(
            "FullSpinFlow", 
            true, 
            string(abi.encodePacked(
                "SpinCost: ", _uint2str(spinCost),
                ", ETH: ", _uint2str(ethValue),
                ", LINK: ", _uint2str(linkReceived),
                ", Prize: ", _uint2str(prizePoolAmount)
            ))
        );
        
        return (true, "All steps succeeded");
    }
    
    // Internal function implementations (similar to CasinoSlot but standalone)
    
    function getLINKCostInUSD() external view returns (uint256) {
        (, int256 linkPriceUSD, , uint256 updatedAt, ) = linkUsdPriceFeed.latestRoundData();
        
        // Validate LINK price
        require(linkPriceUSD > 0, "Invalid LINK price");
        if (block.chainid != 31337) { // Mainnet only check for stale prices
            require(block.timestamp - updatedAt <= 3600*24, "LINK price data stale");
        }
        require(uint256(linkPriceUSD) >= 1 * 1e8, "LINK price too low"); // Min $1
        require(uint256(linkPriceUSD) <= 1000 * 1e8, "LINK price too high"); // Max $1000
        
        // Calculate VRF cost in USD cents with 25% buffer
        uint256 vrfCostUSDCents = (vrfCostLINK * uint256(linkPriceUSD) * 125) / (1e18 * 1e8);
        
        return vrfCostUSDCents;
    }
    
    function convertUSDCentsToETH(uint256 usdCents) external view returns (uint256) {
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        require(ethPriceUSD > 0, "Invalid ETH price");
        if (block.chainid == 1) {
            require(block.timestamp - updatedAt <= 3600*24, "ETH price data stale");
        }
        
        // Convert: USD cents ÷ (USD/ETH) ÷ 100 (cents to dollars) 
        uint256 ethValue = (usdCents * 1e18 * 1e8) / (uint256(ethPriceUSD) * 100);
        
        return ethValue;
    }
    
    function swapETHForLINK(uint256 ethAmountToSpend) external returns (uint256 linkReceived) {
        require(ethAmountToSpend > 0, "ETH amount zero");
        require(address(this).balance >= ethAmountToSpend, "Insufficient ETH");
        
        // Verify key addresses
        require(address(uniswapRouter) != address(0), "Router zero");
        require(address(linkToken) != address(0), "LINK zero");
        
        uint256 initialLINKBalance = linkToken.balanceOf(address(this));
        
        // Create path: ETH -> WETH -> LINK
        address[] memory path = new address[](2);
        path[0] = uniswapRouter.WETH();     // WETH from router
        path[1] = address(linkToken);       // LINK token
        
        // Calculate minimum acceptable output with slippage protection
        uint256[] memory amountsOut = uniswapRouter.getAmountsOut(ethAmountToSpend, path);
        uint256 minLinkOut = amountsOut[1] * (10000 - maxSlippageBPS) / 10000; // Apply max slippage
        
        // Execute V2 swap: ETH -> LINK with slippage protection
        try uniswapRouter.swapExactETHForTokens{value: ethAmountToSpend}(
            minLinkOut,                    // minimum LINK to receive
            path,                          // path [WETH, LINK]
            address(this),                 // recipient
            block.timestamp + 300          // deadline (5 minutes)
        ) returns (uint256[] memory amounts) {
            linkReceived = amounts[1];     // Amount of LINK received
        } catch {
            // Fallback to zero slippage protection if first attempt fails
            uint256[] memory amounts = uniswapRouter.swapExactETHForTokens{value: ethAmountToSpend}(
                0,                         // accept any amount (last resort)
                path,                      // path [WETH, LINK]
                address(this),             // recipient
                block.timestamp + 300      // deadline (5 minutes)
            );
            linkReceived = amounts[1];     // Amount of LINK received
        }
        
        require(linkReceived > 0, "Swap failed");
        require(linkToken.balanceOf(address(this)) > initialLINKBalance, "No LINK increase");
        
        return linkReceived;
    }
    
    function getSpinCost(uint8 reelCount) public view returns (uint256) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        // Base cost in USD cents
        uint256 baseCostUSD = baseChipPriceUSD;
        
        // Add VRF cost (convert LINK to USD)
        uint256 vrfCostUSD;
        try this.getLINKCostInUSD() returns (uint256 _vrfCostUSD) {
            vrfCostUSD = _vrfCostUSD;
        } catch {
            return 0; // Failed to get VRF cost
        }
        
        // Total base cost
        uint256 totalBaseCostUSD = baseCostUSD + vrfCostUSD;
        
        // Apply reel scaling multiplier
        uint256 reelMultiplier = getReelMultiplier(reelCount);
        uint256 scaledCostUSD = (totalBaseCostUSD * reelMultiplier) / 10000;
        
        // scaledCostUSD is in cents, 1 CHIP = $0.20, so 5 CHIPS per dollar
        // Formula: (scaledCostUSD * 5 * 1e18) / 100 = CHIPS with 18 decimals
        uint256 costInCHIPS = (scaledCostUSD * 5 * 1e18) / 100;
        
        return costInCHIPS;
    }
    
    function getReelMultiplier(uint8 reelCount) public pure returns (uint256) {
        if (reelCount == 3) return 10000;   // 100% (base)
        if (reelCount == 4) return 25000;   // 250%
        if (reelCount == 5) return 75000;   // 750%
        if (reelCount == 6) return 200000;  // 2000%
        if (reelCount == 7) return 500000;  // 5000%
        revert("Invalid reel count");
    }
    
    function calculateETHFromCHIPS(uint256 chipsAmount) public view returns (uint256) {
        // Get ETH price in USD
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        require(ethPriceUSD > 0, "Invalid ETH price");
        if (block.chainid == 1) {
            require(block.timestamp - updatedAt <= 3600*24, "ETH price data stale");
        }
        
        // Calculate: (chipsAmount * baseChipPriceUSD * 1e8) / (ethPriceUSD * 100)
        uint256 ethValue = (chipsAmount * baseChipPriceUSD * 1e8) / (uint256(ethPriceUSD) * 100);
        
        return ethValue;
    }
    
    // Helper function to withdraw LINK
    function withdrawLINK(uint256 amount) external onlyOwner {
        require(linkToken.transfer(owner(), amount), "Transfer failed");
    }
    
    // Helper function to withdraw ETH
    function withdrawETH(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
    }
    
    // Helper: Convert uint to string
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
    
    // Get the result of a VRF request
    function getVRFResult(uint256 _requestId) external view returns (bool fulfilled, uint256[] memory randomWords) {
        return (requests[_requestId].fulfilled, requests[_requestId].randomWords);
    }
} 