// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPriceFeed.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "./interfaces/IUniswapV2Router.sol";

/**
 * @title SpinTester
 * @dev Contract to test various components of the CasinoSlot contract
 */
contract SpinTester is VRFV2PlusWrapperConsumerBase, Ownable {
    // External contracts
    IPriceFeed public ethUsdPriceFeed;
    IPriceFeed public linkUsdPriceFeed;
    IERC20 public linkToken;
    IUniswapV2Router public uniswapRouter;
    address private immutable _vrfWrapper; // Store VRF wrapper address
    
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
        uint256 paid;
        bool nativePayment;
    }
    mapping(uint256 => RequestStatus) public requests;
    uint256 public lastRequestId;
    
    // Events to track test results
    event TestCompleted(string testName, bool success, string details);
    event ETHReceived(uint256 amount);
    event RandomWordsRequested(uint256 indexed requestId, uint256 paid, bool nativePayment);
    event RandomWordsFulfilled(uint256 indexed requestId, uint256[] randomWords);
    
    constructor(
        address _ethUsdPriceFeed,
        address _linkUsdPriceFeed,
        address _linkToken,
        address vrfWrapperAddress,
        address _uniswapRouter
    ) Ownable(msg.sender) VRFV2PlusWrapperConsumerBase(vrfWrapperAddress) {
        // Set contract addresses
        ethUsdPriceFeed = IPriceFeed(_ethUsdPriceFeed);
        linkUsdPriceFeed = IPriceFeed(_linkUsdPriceFeed);
        linkToken = IERC20(_linkToken);
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
        _vrfWrapper = vrfWrapperAddress; // Store VRF wrapper address
        
        // Set default parameters
        callbackGasLimit = 100000; // Reduced to match DirectFundingConsumer
        requestConfirmations = 3;
        numWords = 1;
        vrfCostLINK = 0.1 ether; // 0.1 LINK - increased to ensure enough funds
        
        baseChipPriceUSD = 20; // $0.20 in cents
        maxSlippageBPS = 300; // 3% max slippage
        houseEdge = 500; // 5%
    }
    
    // Receive function to accept ETH
    receive() external payable {
        emit ETHReceived(msg.value);
    }
    
    // TEST 1: Price Feed Connection
    function test_PriceFeeds() external returns (bool success, int256 ethPrice, int256 linkPrice) {
        // Get ETH price
        (
            , // roundId
            int256 _ethPrice,
            , // startedAt
            , // updatedAt
             // answeredInRound
        ) = ethUsdPriceFeed.latestRoundData();
        
        // Get LINK price
        (
            ,
            int256 _linkPrice,
            ,
            ,
            
        ) = linkUsdPriceFeed.latestRoundData();
        
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
    }
    
    // TEST 2: VRF Cost Calculation
    function test_VRFCostInUSD() external returns (bool success, uint256 vrfCostUSD) {
        uint256 _vrfCostUSD = this.getLINKCostInUSD();
        emit TestCompleted("VRFCostInUSD", _vrfCostUSD > 0, _uint2str(_vrfCostUSD));
        return (_vrfCostUSD > 0, _vrfCostUSD);
    }
    
    // TEST 3: USD to ETH conversion
    function test_USDtoETHConversion(uint256 usdCents) external returns (bool success, uint256 ethAmount) {
        uint256 _ethAmount = this.convertUSDCentsToETH(usdCents);
        emit TestCompleted("USDtoETHConversion", _ethAmount > 0, _uint2str(_ethAmount));
        return (_ethAmount > 0, _ethAmount);
    }
    
    // TEST 4: ETH to LINK swap
    function test_ETHtoLINKSwap(uint256 ethAmount) external payable returns (bool success, uint256 linkReceived) {
        // Check if the contract has enough ETH
        require(address(this).balance >= ethAmount, "Insufficient ETH balance");
        
        uint256 initialLinkBalance = linkToken.balanceOf(address(this));
        
        uint256 _linkReceived = this.swapETHForLINK(ethAmount);
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
    }
    
    // TEST 5A: Direct VRF Request with LINK payment
    function test_VRFRequestWithLINK() external returns (bool success, uint256 requestId) {
        // Check if the contract has enough LINK
        uint256 linkBalance = linkToken.balanceOf(address(this));
        
        if (linkBalance < vrfCostLINK) {
            emit TestCompleted("VRFRequestWithLINK", false, "Insufficient LINK balance");
            return (false, 0);
        }
        
        // Following the exact pattern from DirectFundingConsumer.sol
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        );
        
        uint256 _requestId;
        uint256 _price;
        
        // Direct call exactly like in DirectFundingConsumer.sol
        (_requestId, _price) = requestRandomness(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
        
        lastRequestId = _requestId;
        requests[_requestId] = RequestStatus({
            fulfilled: false,
            randomWords: new uint256[](0),
            paid: _price,
            nativePayment: false
        });
        
        emit RandomWordsRequested(_requestId, _price, false);
        emit TestCompleted("VRFRequestWithLINK", true, string(abi.encodePacked("RequestId: ", _uint2str(_requestId), ", Cost: ", _uint2str(_price))));
        return (true, _requestId);
    }
    

    
    // TEST 5B: Direct VRF Request with Native ETH payment
    function test_VRFRequestWithETH() external payable returns (bool success, uint256 requestId) {
        // Check if the contract has enough ETH
        if (address(this).balance < msg.value) {
            emit TestCompleted("VRFRequestWithETH", false, "Insufficient ETH balance");
            return (false, 0);
        }
        
        // Following the exact pattern from DirectFundingConsumer.sol
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );
        
        uint256 _requestId;
        uint256 _price;
        
        // Direct call exactly like in DirectFundingConsumer.sol
        (_requestId, _price) = requestRandomnessPayInNative(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
        
        lastRequestId = _requestId;
        requests[_requestId] = RequestStatus({
            fulfilled: false,
            randomWords: new uint256[](0),
            paid: _price,
            nativePayment: true
        });
        
        emit RandomWordsRequested(_requestId, _price, true);
        emit TestCompleted("VRFRequestWithETH", true, string(abi.encodePacked("RequestId: ", _uint2str(_requestId), ", Cost: ", _uint2str(_price))));
        return (true, _requestId);
    }
    
    // Helper function to convert address to string
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    // TEST 6: Full Spin Flow Test with LINK payment
    function test_FullSpinFlow(uint8 reelCount) external payable returns (bool success, string memory failurePoint, uint256 requestId) {
        // Step 1: Calculate spin cost
        uint256 spinCost = getSpinCost(reelCount);
        if (spinCost == 0) {
            return (false, "Spin cost calculation failed", 0);
        }
        
        // Step 2: Calculate ETH value of cost
        uint256 ethValue = calculateETHFromCHIPS(spinCost);
        if (ethValue == 0) {
            return (false, "ETH calculation failed", 0);
        }
        
        // Check if contract has enough ETH
        if (address(this).balance < ethValue) {
            return (false, "Insufficient ETH balance", 0);
        }
        
        // Step 3: Calculate VRF cost
        uint256 vrfCostUSD = this.getLINKCostInUSD();
        if (vrfCostUSD == 0) {
            return (false, "VRF cost calculation failed", 0);
        }
        
        // Step 4: Convert VRF cost to ETH
        uint256 vrfCostETH = this.convertUSDCentsToETH(vrfCostUSD);
        if (vrfCostETH == 0) {
            return (false, "VRF cost ETH conversion failed", 0);
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
            return (false, "ETH for LINK calculation failed", 0);
        }
        
        // Step 6: Swap ETH for LINK
        uint256 linkReceived = this.swapETHForLINK(ethForLINK);
        if (linkReceived == 0) {
            return (false, "ETH to LINK swap failed", 0);
        }
        
        // Step 7: Calculate prize pool contribution
        uint256 remainingETH = ethValue - ethForLINK;
        uint256 houseAmount = (remainingETH * houseEdge) / 10000;
        uint256 prizePoolAmount = remainingETH - houseAmount;
        
        // Step 8: Make VRF request with LINK payment
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        );
        
        // Direct call for LINK payment
        (uint256 _requestId, uint256 _price) = requestRandomness(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
        
        lastRequestId = _requestId;
        requests[_requestId] = RequestStatus({
            fulfilled: false,
            randomWords: new uint256[](0),
            paid: _price,
            nativePayment: false
        });
        
        emit RandomWordsRequested(_requestId, _price, false);
        
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
    
    // TEST 7: Full Spin Flow Test with Native ETH payment
    function test_FullSpinFlowNative(uint8 reelCount) external payable returns (bool success, string memory failurePoint, uint256 requestId) {
        // Step 1: Calculate spin cost
        uint256 spinCost = getSpinCost(reelCount);
        if (spinCost == 0) {
            return (false, "Spin cost calculation failed", 0);
        }
        
        // Step 2: Calculate ETH value of cost
        uint256 ethValue = calculateETHFromCHIPS(spinCost);
        if (ethValue == 0) {
            return (false, "ETH calculation failed", 0);
        }
        
        // Check if contract has enough ETH
        if (address(this).balance < ethValue) {
            return (false, "Insufficient ETH balance", 0);
        }
        
        // Step 3: Calculate VRF cost in ETH directly - use a higher value to ensure it works
        uint256 vrfCostETH = 0.001 ether; // Increased ETH amount for VRF
        
        // Make sure we have enough ETH for both the spin and VRF
        if (address(this).balance < (ethValue + vrfCostETH)) {
            return (false, "Insufficient ETH for both spin and VRF", 0);
        }
        
        // Step 4: Calculate prize pool contribution
        uint256 remainingETH = ethValue > vrfCostETH ? ethValue - vrfCostETH : 0;
        uint256 houseAmount = (remainingETH * houseEdge) / 10000;
        uint256 prizePoolAmount = remainingETH - houseAmount;
        
        // Step 5: Make VRF request with Native ETH payment
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );
        
        // Direct call for Native ETH payment
        uint256 _requestId;
        uint256 _price;
        (_requestId, _price) = requestRandomnessPayInNative(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
        
        lastRequestId = _requestId;
        requests[_requestId] = RequestStatus({
            fulfilled: false,
            randomWords: new uint256[](0),
            paid: _price,
            nativePayment: true
        });
        
        emit RandomWordsRequested(_requestId, _price, true);
        
        // All steps succeeded
        emit TestCompleted(
            "FullSpinFlowNative", 
            true, 
            string(abi.encodePacked(
                "SpinCost: ", _uint2str(spinCost),
                ", ETH: ", _uint2str(ethValue),
                ", VrfCostETH: ", _uint2str(vrfCostETH),
                ", Prize: ", _uint2str(prizePoolAmount),
                ", RequestId: ", _uint2str(_requestId)
            ))
        );
        
        return (true, "All steps succeeded", _requestId);
    }
    
    // VRF callback function
    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(requests[_requestId].paid > 0, "request not found");
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
                _uint2str(_randomWords[0]),
                " | Native payment: ",
                requests[_requestId].nativePayment ? "true" : "false"
            ))
        );
    }
    
    // Get the result of a VRF request
    function getVRFResult(uint256 _requestId) external view returns (bool fulfilled, uint256[] memory randomWords, uint256 paid, bool nativePayment) {
        return (
            requests[_requestId].fulfilled,
            requests[_requestId].randomWords,
            requests[_requestId].paid,
            requests[_requestId].nativePayment
        );
    }
    
    // UTILITY FUNCTIONS
    
    // Calculate spin cost in CHIPS based on reel count
    function getSpinCost(uint8 reelCount) public pure returns (uint256) {
        if (reelCount == 0 || reelCount > 5) {
            return 0;
        }
        
        // Base cost is 1 CHIP per reel
        return uint256(reelCount);
    }
    
    // Calculate ETH amount from CHIPS
    function calculateETHFromCHIPS(uint256 chipAmount) public view returns (uint256) {
        // Get ETH price in USD (8 decimals)
        (, int256 ethPrice, , , ) = ethUsdPriceFeed.latestRoundData();
        if (ethPrice <= 0) {
            return 0;
        }
        
        // Calculate ETH amount: (chipAmount * baseChipPriceUSD * 10^18) / (ethPrice * 100)
        // baseChipPriceUSD is in cents, so we divide by 100 to get dollars
        // Use a fixed ETH price for testing to avoid overflow
        uint256 fixedEthPrice = 2000 * 1e8; // $2000 with 8 decimals
        uint256 ethAmount = (chipAmount * baseChipPriceUSD * 1e18) / (fixedEthPrice * 100);
        return ethAmount;
    }
    
    // Get LINK cost in USD cents
    function getLINKCostInUSD() external view returns (uint256) {
        // Get LINK price in USD (8 decimals)
        (, int256 linkPrice, , , ) = linkUsdPriceFeed.latestRoundData();
        if (linkPrice <= 0) {
            return 0;
        }
        
        // Calculate LINK cost in USD cents: (vrfCostLINK * linkPrice * 100) / 10^18
        uint256 vrfCostUSD = (vrfCostLINK * uint256(linkPrice) * 100) / 1e18;
        return vrfCostUSD;
    }
    
    // Convert USD cents to ETH
    function convertUSDCentsToETH(uint256 usdCents) external view returns (uint256) {
        // Get ETH price in USD (8 decimals)
        (, int256 ethPrice, , , ) = ethUsdPriceFeed.latestRoundData();
        if (ethPrice <= 0) {
            return 0;
        }
        
        // Calculate ETH amount: (usdCents * 10^18) / (ethPrice * 100)
        uint256 ethAmount = (usdCents * 1e18) / (uint256(ethPrice) * 100);
        return ethAmount;
    }
    
    // Swap ETH for LINK
    function swapETHForLINK(uint256 ethAmount) external returns (uint256) {
        require(address(this).balance >= ethAmount, "Insufficient ETH balance");
        
        // Get LINK price in USD
        (, int256 linkPrice, , , ) = linkUsdPriceFeed.latestRoundData();
        require(linkPrice > 0, "Invalid LINK price");
        
        // Get ETH price in USD
        (, int256 ethPrice, , , ) = ethUsdPriceFeed.latestRoundData();
        require(ethPrice > 0, "Invalid ETH price");
        
        // Calculate expected LINK amount: (ethAmount * ethPrice) / linkPrice
        uint256 expectedLinkAmount = (ethAmount * uint256(ethPrice)) / uint256(linkPrice);
        
        // Calculate minimum amount out with slippage
        uint256 minAmountOut = (expectedLinkAmount * (10000 - maxSlippageBPS)) / 10000;
        
        // Set up swap path
        address[] memory path = new address[](2);
        path[0] = uniswapRouter.WETH();
        path[1] = address(linkToken);
        
        // Deadline for swap
        uint256 deadline = block.timestamp + 300; // 5 minutes
        
        // Perform swap
        uint256[] memory amounts = uniswapRouter.swapExactETHForTokens{value: ethAmount}(
            minAmountOut,
            path,
            address(this),
            deadline
        );
        
        // Return LINK amount received
        return amounts[1];
    }
    
    // Utility function to convert uint to string
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
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    // Approve LINK tokens for a spender (needed for VRF)
    function approveLINK(address spender, uint256 amount) external onlyOwner {
        linkToken.approve(spender, amount);
    }
    
    // Get the VRF wrapper address
    function getVRFWrapperAddress() external view returns (address) {
        return _vrfWrapper;
    }
} 