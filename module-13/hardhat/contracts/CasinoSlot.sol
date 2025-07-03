// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPayoutTables.sol";
import "./interfaces/IPriceFeed.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/IWETH9.sol";

// VRF Wrapper interface for direct funding
interface IVRFV2PlusWrapper {
    function requestRandomness(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes memory extraArgs
    ) external returns (uint256 requestId, uint256 reqPrice);
    
    function requestRandomnessPayInNative(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes memory extraArgs
    ) external payable returns (uint256 requestId, uint256 reqPrice);
}

/**
 * @title CasinoSlot - Professional-grade on-chain slot machine with real-time ETH→LINK swapping
 * @author David Roman
 * @notice Advanced casino system with Uniswap V2 integration for VRF cost management
 * @dev UUPS upgradeable contract with real-time LINK purchasing per spin
 */
contract CasinoSlot is 
    Initializable,
    ERC20Upgradeable,
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable,
    OwnableUpgradeable
{
    
    // Chainlink VRF Direct Funding - MUCH SIMPLER!
    IVRFV2PlusWrapper public vrfWrapper;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;
    
    // External contracts
    IPayoutTables public payoutTables;
    IPriceFeed internal ethUsdPriceFeed;
    IPriceFeed internal linkUsdPriceFeed; // LINK/USD price feed
    IERC20 public linkToken; // LINK token contract (ERC20)
    IUniswapV2Router public uniswapRouter; // Uniswap V2 router
    IWETH9 public wethToken; // WETH contract
    
    // Core game state
    uint256 public totalPrizePool;
    uint256 public houseEdge; // 5% (500 basis points)
    
    // Economic parameters
    uint256 public baseChipPriceUSD; // Base CHIP price in cents (e.g., 20 = $0.20)
    uint256 public vrfCostLINK; // VRF cost in LINK tokens (18 decimals)
    uint256 public maxSlippageBPS; // Maximum slippage for LINK swaps (basis points)
    
    // Reel scaling multipliers (basis points - 10000 = 100%)
    uint256 public constant REEL_3_MULTIPLIER = 10000;  // 100% (base)
    uint256 public constant REEL_4_MULTIPLIER = 25000;  // 250% (2.5x more expensive)
    uint256 public constant REEL_5_MULTIPLIER = 75000;  // 750% (7.5x more expensive)
    uint256 public constant REEL_6_MULTIPLIER = 200000; // 2000% (20x more expensive)
    uint256 public constant REEL_7_MULTIPLIER = 500000; // 5000% (50x more expensive)
    
    // Game mappings and state
    mapping(uint256 => Spin) public spins;
    mapping(address => uint256) public playerWinnings;
    mapping(address => uint256) public totalSpins;
    mapping(address => uint256) public totalWon;
    mapping(address => uint256) public totalBet;
    
    // Events
    event SpinRequested(uint256 indexed requestId, address indexed player, uint8 reelCount, uint256 betAmount);
    event SpinResult(
        uint256 indexed requestId, 
        address indexed player, 
        uint8 reelCount,
        uint256[] reels, 
        IPayoutTables.PayoutType payoutType, 
        uint256 payout
    );
    event WinningsWithdrawn(address indexed player, uint256 amount);
    // 0: SPIN_CONTRIBUTION, 1: JACKPOT_PAYOUT, 2: ETH_DEPOSIT, 3: LINK_SWAP
    event PrizePoolStateChanged(uint256 newTotalPrizePool, int256 amount, uint8 indexed reason);
    event PayoutTablesUpdated(address indexed newPayoutTables);
    event ChipsPurchased(address indexed player, uint256 ethAmount, uint256 chipsAmount);
    event EthWithdrawn(address indexed owner, uint256 amount);
    event HouseFeeCollected(uint256 indexed requestId, address indexed player, uint256 amount);
    event PlayerStatsUpdated(address indexed player, uint256 totalSpins, uint256 totalWinnings, uint256 totalBet);
    event ContractInitialized(uint8 version);
    event WinningsCredited(address indexed player, uint256 amount);
    event VRFCostUpdated(uint256 newVrfCostLINK);
    event LINKWithdrawn(address indexed owner, uint256 amount);
    event DynamicPricingUpdated(uint256 baseChipPriceUSD, uint256 vrfCostLINK, uint256 linkBuffer);
    event LINKSwapped(uint256 indexed requestId, uint256 ethIn, uint256 linkOut, uint256 remainingETH);
    event UniswapParamsUpdated(uint256 maxSlippageBPS, uint24 uniswapFee);
    
    struct Spin {
        address player;
        uint256 betAmount;
        uint8 reelCount;      // Number of reels for this spin
        uint256[] reels;      // Dynamic array for reel results
        IPayoutTables.PayoutType payoutType;
        uint256 payout;
        bool settled;
        uint256 timestamp;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the contract (replaces constructor for upgradeable pattern)
     */
    function initialize(
        address ethUsdPriceFeedAddress,
        address linkUsdPriceFeedAddress,
        address linkTokenAddress,
        address payoutTablesAddress,
        address wrapperAddress,
        address uniswapRouterAddress,
        address wethTokenAddress,
        address initialOwner
    ) public initializer {
        __ERC20_init("CasinoSlot Casino Chips", "CHIPS");
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(initialOwner);
        
        vrfWrapper = IVRFV2PlusWrapper(wrapperAddress);
        ethUsdPriceFeed = IPriceFeed(ethUsdPriceFeedAddress);
        linkUsdPriceFeed = IPriceFeed(linkUsdPriceFeedAddress);
        linkToken = IERC20(linkTokenAddress);
        payoutTables = IPayoutTables(payoutTablesAddress);
        uniswapRouter = IUniswapV2Router(uniswapRouterAddress);
        wethToken = IWETH9(wethTokenAddress);
        
        // Initialize VRF parameters
        callbackGasLimit = 200000;
        requestConfirmations = 3;
        numWords = 1;
        houseEdge = 500; // 5%
        
        // Initialize economic parameters
        baseChipPriceUSD = 20; // $0.20 in cents
        vrfCostLINK = 0.01 ether; // 0.01 LINK per VRF request (~$0.14) - higher for testable amounts
        maxSlippageBPS = 300; // 3% max slippage
        
        emit ContractInitialized(1);
    }
    
    /**
     * @dev Authorize upgrade - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @dev Update the payout tables contract address
     */
    function updatePayoutTables(address newPayoutTables) external onlyOwner {
        require(newPayoutTables != address(0), "Invalid address");
        payoutTables = IPayoutTables(newPayoutTables);
        emit PayoutTablesUpdated(newPayoutTables);
    }
    
    /**
     * @dev Update dynamic pricing parameters (owner only)
     */
    function updateDynamicPricing(
        uint256 newBaseChipPriceUSD,
        uint256 newVrfCostLINK
    ) external onlyOwner {
        require(newBaseChipPriceUSD > 0 && newBaseChipPriceUSD <= 10000, "Invalid base price"); // Max $100
        require(newVrfCostLINK > 0 && newVrfCostLINK <= 10 ether, "Invalid VRF cost"); // Max 10 LINK
        
        baseChipPriceUSD = newBaseChipPriceUSD;
        vrfCostLINK = newVrfCostLINK;
        
        emit DynamicPricingUpdated(newBaseChipPriceUSD, newVrfCostLINK, 0);
    }
    
    /**
     * @dev Get the dynamic cost for a specific reel mode in CHIPS
     * Formula: (Base Cost + VRF Cost) × Reel Multiplier
     */
    function getSpinCost(uint8 reelCount) public view returns (uint256) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        // Base cost in USD cents
        uint256 baseCostUSD = baseChipPriceUSD;
        
        // Add VRF cost (convert LINK to USD)
        uint256 vrfCostUSD = _getLINKCostInUSD();
        
        // Total base cost
        uint256 totalBaseCostUSD = baseCostUSD + vrfCostUSD;
        
        // Apply reel scaling multiplier
        uint256 reelMultiplier = _getReelMultiplier(reelCount);
        uint256 scaledCostUSD = (totalBaseCostUSD * reelMultiplier) / 10000;
        
        // scaledCostUSD is in cents, 1 CHIP = $0.20, so 5 CHIPS per dollar
        // Formula: (scaledCostUSD * 5 * 1e18) / 100 = CHIPS with 18 decimals
        uint256 costInCHIPS = (scaledCostUSD * 5 * 1e18) / 100;
        
        return costInCHIPS;
    }
    
    /**
     * @dev Get reel scaling multiplier in basis points
     */
    function _getReelMultiplier(uint8 reelCount) internal pure returns (uint256) {
        if (reelCount == 3) return REEL_3_MULTIPLIER;   // 100% (base)
        if (reelCount == 4) return REEL_4_MULTIPLIER;   // 250%
        if (reelCount == 5) return REEL_5_MULTIPLIER;   // 750%
        if (reelCount == 6) return REEL_6_MULTIPLIER;   // 2000%
        if (reelCount == 7) return REEL_7_MULTIPLIER;   // 5000%
        revert("Invalid reel count");
    }
    
    /**
     * @dev Get VRF cost in USD cents (with buffer)
     */
    function _getLINKCostInUSD() internal view virtual returns (uint256) {
        (, int256 linkPriceUSD, , uint256 updatedAt, ) = linkUsdPriceFeed.latestRoundData();
        
        // Validate LINK price
        require(linkPriceUSD > 0, "Invalid LINK price");
        if (block.chainid != 31337) { // Mainnet only check for stale prices
            require(block.timestamp - updatedAt <= 3600*24, "LINK price data stale");
        }
        require(uint256(linkPriceUSD) >= 1 * 1e8, "LINK price too low"); // Min $1
        require(uint256(linkPriceUSD) <= 1000 * 1e8, "LINK price too high"); // Max $1000
        
        // Calculate VRF cost in USD cents with 25% buffer (increased from 10%)
        // vrfCostLINK (18 decimals) * linkPriceUSD (8 decimals) * 125 (buffer) / (1e18 * 1e8)
        // = USD cents with proper precision
        uint256 vrfCostUSDCents = (vrfCostLINK * uint256(linkPriceUSD) * 125) / (1e18 * 1e8);
        
        return vrfCostUSDCents;
    }
    
    /**
     * @dev Spin 3 reels (classic mode) - Dynamic pricing
     */
    function spin3Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        uint256 cost = getSpinCost(3);
        return _executeSpin(3, cost);
    }
    
    /**
     * @dev Spin 4 reels (expanded mode) - Dynamic pricing  
     */
    function spin4Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        uint256 cost = getSpinCost(4);
        return _executeSpin(4, cost);
    }
    
    /**
     * @dev Spin 5 reels (premium mode) - Dynamic pricing
     */
    function spin5Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        uint256 cost = getSpinCost(5);
        return _executeSpin(5, cost);
    }
    
    /**
     * @dev Spin 6 reels (high roller mode) - Dynamic pricing
     */
    function spin6Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        uint256 cost = getSpinCost(6);
        return _executeSpin(6, cost);
    }
    
    /**
     * @dev Spin 7 reels (whale mode) - Dynamic pricing
     */
    function spin7Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        uint256 cost = getSpinCost(7);
        return _executeSpin(7, cost);
    }
    
    /**
     * @dev Internal function to execute a spin for any reel count
     */
    function _executeSpin(uint8 reelCount, uint256 cost) internal returns (uint256 requestId) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        // Critical checks only
        require(balanceOf(msg.sender) >= cost, "Insufficient CHIPS");
        require(allowance(msg.sender, address(this)) >= cost, "Insufficient allowance");
        require(address(this).balance > 0, "No ETH balance");

        // Burn CHIPS from player 
        _burn(msg.sender, cost);
        
        // Calculate ETH value of burned CHIPS
        uint256 ethValue = calculateETHFromCHIPS(cost);
        require(ethValue > 0, "ETH calc failed");
        require(address(this).balance >= ethValue, "Insufficient ETH");
        
        // VRF cost calculations
        uint256 vrfCostUSD = _getLINKCostInUSD();
        require(vrfCostUSD > 0, "VRF cost zero");
        
        uint256 vrfCostETH = _convertUSDCentsToETH(vrfCostUSD);
        require(vrfCostETH > 0, "VRF ETH zero");
        
        // Use portion of ETH value for LINK purchase (ensure we have enough)
        uint256 ethForLINK;
        if (vrfCostETH <= ethValue) {
            ethForLINK = vrfCostETH;
        } else {
            // If VRF cost is too high, use 10% of ETH value (multiply first!)
            ethForLINK = (ethValue * 10) / 100; // 10% of ethValue
            // Ensure minimum amount
            if (ethForLINK < 1000) { // Minimum 1000 wei
                ethForLINK = 1000;
            }
        }
        
        require(ethForLINK > 0, "ETH for LINK zero");
        
        // Check initial LINK balance
        uint256 linkBalanceBefore = linkToken.balanceOf(address(this));
        
        // Swap ETH for LINK
        uint256 linkReceived = _swapETHForLINK(ethForLINK);
        
        require(linkReceived > 0, "LINK swap failed");
        require(linkToken.balanceOf(address(this)) > linkBalanceBefore, "No LINK increase");
        
        // Calculate remaining ETH after LINK purchase
        uint256 remainingETH = ethValue - ethForLINK;
        
        // Apply house edge to remaining ETH
        uint256 houseAmount = (remainingETH * houseEdge) / 10000;
        uint256 prizePoolAmount = remainingETH - houseAmount;
        
        // Add to prize pool
        totalPrizePool += prizePoolAmount;
        emit PrizePoolStateChanged(totalPrizePool, int256(prizePoolAmount), 0);
        
        // VRF checks
        require(address(vrfWrapper) != address(0), "VRF wrapper zero");
        require(linkToken.balanceOf(address(this)) > 0, "No LINK for VRF");
        
        // 🎯 DIRECT VRF REQUEST - NO SUBSCRIPTION NEEDED!
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false}) // Pay with LINK
        );
        
        (requestId, ) = vrfWrapper.requestRandomness(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
        
        require(requestId > 0, "VRF request failed");
        
        // Reset allowance to 0 after spin to force re-approval
        _approve(msg.sender, address(this), 0);

        emit HouseFeeCollected(requestId, msg.sender, houseAmount);
        emit LINKSwapped(requestId, ethForLINK, linkReceived, remainingETH);
        
        // Store spin data
        spins[requestId] = Spin({
            player: msg.sender,
            betAmount: cost,
            reelCount: reelCount,
            reels: new uint256[](reelCount), // Initialize empty array
            payoutType: IPayoutTables.PayoutType.LOSE,
            payout: 0,
            settled: false,
            timestamp: block.timestamp
        });
        
        totalSpins[msg.sender]++;
        totalBet[msg.sender] += cost;
        emit PlayerStatsUpdated(msg.sender, totalSpins[msg.sender], totalWon[msg.sender], totalBet[msg.sender]);
        
        emit SpinRequested(requestId, msg.sender, reelCount, cost);
        return requestId;
    }
    
    /**
     * @dev Convert USD cents to ETH value
     */
    function _convertUSDCentsToETH(uint256 usdCents) internal view returns (uint256 ethValue) {
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        require(ethPriceUSD > 0, "Invalid ETH price");
        if (block.chainid == 1) {
            require(block.timestamp - updatedAt <= 3600*24, "ETH price data stale");
        }
        
        // Convert: USD cents ÷ (USD/ETH) ÷ 100 (cents to dollars) 
        ethValue = (usdCents * 1e18 * 1e8) / (uint256(ethPriceUSD) * 100);
        
        return ethValue;
    }
    
    /**
     * @dev Calculate ETH value from CHIPS amount
     * @param chipsAmount Amount of CHIPS
     * @return ethValue Equivalent ETH value
     */
    function calculateETHFromCHIPS(uint256 chipsAmount) public view returns (uint256 ethValue) {
        // CHIPS are valued at $0.20 each (baseChipPriceUSD in cents)
        // MULTIPLY FIRST to maintain precision, then divide
        
        // Get ETH price in USD
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        require(ethPriceUSD > 0, "Invalid ETH price");
        if (block.chainid == 1) {
            require(block.timestamp - updatedAt <= 3600*24, "ETH price data stale");
        }
        
        // Calculate: (chipsAmount * baseChipPriceUSD * 1e18 * 1e8) / (1e18 * ethPriceUSD * 100)
        // Simplifies to: (chipsAmount * baseChipPriceUSD * 1e8) / (ethPriceUSD * 100)
        ethValue = (chipsAmount * baseChipPriceUSD * 1e8) / (uint256(ethPriceUSD) * 100);
        
        return ethValue;
    }
    
    /**
     * @dev Swap ETH for LINK using Uniswap V2 - spend exact ETH amount
     * @param ethAmountToSpend Exact amount of ETH to spend
     * @return linkReceived Amount of LINK tokens received
     */
    function _swapETHForLINK(uint256 ethAmountToSpend) internal virtual returns (uint256 linkReceived) {
        require(ethAmountToSpend > 0, "ETH amount zero");
        require(address(this).balance >= ethAmountToSpend, "Insufficient ETH");
        
        // Verify key addresses
        require(address(uniswapRouter) != address(0), "Router zero");
        require(address(linkToken) != address(0), "LINK zero");
        
        // Check router has code (simplified)
        require(address(uniswapRouter).code.length > 0, "Router no code");
        
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
        
        // Verify LINK balance increased
        require(linkToken.balanceOf(address(this)) > initialLINKBalance, "No LINK increase");
        
        return linkReceived;
    }
    
    /**
     * @dev Get LINK price in ETH (not USD)
     * @return linkPriceETH LINK price in ETH with 18 decimals
     */
    function _getLINKPriceInETH() internal view returns (uint256 linkPriceETH) {
        // Get LINK/USD price
        (, int256 linkPriceUSD, , uint256 linkUpdatedAt, ) = linkUsdPriceFeed.latestRoundData();
        require(linkPriceUSD > 0, "Invalid LINK price");
        require(block.timestamp - linkUpdatedAt <= 3600*24, "LINK price data stale");
        
        // Get ETH/USD price  
        (, int256 ethPriceUSD, , uint256 ethUpdatedAt, ) = ethUsdPriceFeed.latestRoundData();
        require(ethPriceUSD > 0, "Invalid ETH price");
        require(block.timestamp - ethUpdatedAt <= 3600*24, "ETH price data stale");
        
        // Calculate LINK price in ETH: (LINK/USD) / (ETH/USD) = LINK/ETH
        linkPriceETH = (uint256(linkPriceUSD) * 1e18) / uint256(ethPriceUSD);
        
        return linkPriceETH;
    }
    
    /**
     * @dev Generate reels from VRF randomness
     */
    function _generateReels(uint256 randomness, uint8 reelCount) internal pure returns (uint256[] memory) {
        uint256[] memory reels = new uint256[](reelCount);
        
        // Use different parts of the random number for each reel
        for (uint8 i = 0; i < reelCount; i++) {
            // Shift and extract 8 bits for each reel, then mod 6 to get 1-6
            uint256 reelValue = ((randomness >> (i * 8)) % 6) + 1;
            reels[i] = reelValue;
        }
        
        return reels;
    }
    
    /**
     * @dev Calculate payout based on reel results using external payout tables
     */
    function _calculateModeBasedPayout(uint8 reelCount, uint256[] memory reels, uint256 betAmount) internal view returns (IPayoutTables.PayoutType, uint256) {
        // Convert reels array to combination key (e.g., [3,3,3] -> 333)
        uint256 combinationKey = 0;
        for (uint8 i = 0; i < reels.length; i++) {
            combinationKey = combinationKey * 10 + reels[i];
        }
        
        // Get payout type from external contract
        IPayoutTables.PayoutType payoutType = payoutTables.getPayoutType(reelCount, combinationKey);
        
        // Calculate payout amount
        uint256 payout = 0;
        
        if (payoutType == IPayoutTables.PayoutType.SMALL_WIN) {
            payout = betAmount * 2;
        } else if (payoutType == IPayoutTables.PayoutType.MEDIUM_WIN) {
            payout = betAmount * 5;
        } else if (payoutType == IPayoutTables.PayoutType.BIG_WIN) {
            payout = betAmount * 10;
        } else if (payoutType == IPayoutTables.PayoutType.SPECIAL_COMBO) {
            payout = betAmount * 20;
        } else if (payoutType == IPayoutTables.PayoutType.MEGA_WIN) {
            payout = betAmount * 50;
        } else if (payoutType == IPayoutTables.PayoutType.ULTRA_WIN) {
            payout = betAmount * 100;
        } else if (payoutType == IPayoutTables.PayoutType.JACKPOT) {
            payout = totalPrizePool / 4; // 25% of prize pool for jackpot
        }
        
        return (payoutType, payout);
    }
    

    
    /**
     * @dev VRF callback function (called by wrapper)
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == address(vrfWrapper), "Only VRF Wrapper can fulfill");
        fulfillRandomWords(requestId, randomWords);
    }

    /**
     * @dev Internal VRF fulfillment logic
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal {
        Spin storage spin = spins[requestId];
        require(spin.player != address(0), "Invalid request ID");
        require(!spin.settled, "Spin already settled");
        
        // Generate reels from randomness
        uint256[] memory reels = _generateReels(randomWords[0], spin.reelCount);
        
        // Calculate payout using external tables
        (IPayoutTables.PayoutType payoutType, uint256 payout) = _calculateModeBasedPayout(spin.reelCount, reels, spin.betAmount);
        
        // Update spin data
        spin.reels = reels;
        spin.payoutType = payoutType;
        spin.payout = payout;
        spin.settled = true;
        
        // Award winnings if any
        if (payout > 0) {
            emit WinningsCredited(spin.player, payout);
            playerWinnings[spin.player] += payout;
            totalWon[spin.player] += payout;
            emit PlayerStatsUpdated(spin.player, totalSpins[spin.player], totalWon[spin.player], totalBet[spin.player]);
            
            // For jackpot, reduce the prize pool
            if (payoutType == IPayoutTables.PayoutType.JACKPOT) {
                totalPrizePool -= payout;
                emit PrizePoolStateChanged(totalPrizePool, -int256(payout), 1);
            }
        }
        
        emit SpinResult(requestId, spin.player, spin.reelCount, reels, payoutType, payout);
    }
    
    /**
     * @dev Withdraw player winnings
     */
    function withdrawWinnings() external nonReentrant {
        uint256 amount = playerWinnings[msg.sender];
        require(amount > 0, "No winnings to withdraw");
        
        playerWinnings[msg.sender] = 0;
        
        // Mint winnings as new CHIPS tokens
        _mint(msg.sender, amount);
        
        emit WinningsWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Get the reels for a specific spin
     */
    function getSpinReels(uint256 requestId) external view returns (uint256[] memory) {
        return spins[requestId].reels;
    }
    
    /**
     * @dev Emergency pause (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraw contract ETH balance (owner only)
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        emit EthWithdrawn(owner(), amount);
        payable(owner()).transfer(amount);
    }
    
    /**
     * @dev Get player statistics
     */
    function getPlayerStats(address player) external view returns (
        uint256 balance,
        uint256 winnings,
        uint256 spinsCount,
        uint256 totalWinnings,
        uint256 totalBetAmount
    ) {
        return (
            balanceOf(player),
            playerWinnings[player],
            totalSpins[player],
            totalWon[player],
            totalBet[player]
        );
    }
    
    /**
     * @dev Get game statistics
     */
    function getGameStats() external view returns (
        uint256 prizePool,
        uint256 houseEdgePercent,
        address payoutTablesAddress
    ) {
        return (
            totalPrizePool,
            houseEdge,
            address(payoutTables)
        );
    }
    
    // Allow contract to receive ETH
    receive() external payable {
        totalPrizePool += msg.value;
        emit PrizePoolStateChanged(totalPrizePool, int256(msg.value), 2);
    }
    
    /**
     * @dev Buy CHIPS with ETH directly
     */
    function buyChips() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        
        // Calculate CHIPS amount based on ETH price
        uint256 chipsAmount = calculateChipsFromETH(msg.value);
        
        // Mint CHIPS to buyer (no inventory needed!)
        _mint(msg.sender, chipsAmount);
        
        // Add ETH to the prize pool
        totalPrizePool += msg.value;
        emit PrizePoolStateChanged(totalPrizePool, int256(msg.value), 2);
        
        emit ChipsPurchased(msg.sender, msg.value, chipsAmount);
    }
    
    /**
     * @dev Calculate CHIPS amount from ETH amount
     */
    function calculateChipsFromETH(uint256 ethAmount) public view returns (uint256) {
        // Get ETH price in USD (with 8 decimals from Chainlink)
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        
        // Standard Chainlink validation - simple and fixed
        require(ethPriceUSD > 0, "Invalid ETH price");
        if (block.chainid == 1) {
            require(block.timestamp - updatedAt <= 3600*24, "Price data stale"); // Fixed 24 hour for now because i need to code and test things
        }
        require(uint256(ethPriceUSD) >= 50 * 1e8, "ETH price too low"); // Fixed $50 minimum
        require(uint256(ethPriceUSD) <= 100000 * 1e8, "ETH price too high"); // Fixed $100K maximum
        
        // Basic amount validation
        require(ethAmount > 0, "ETH amount must be positive");
        require(ethAmount <= 1000 ether, "ETH amount too large"); // Fixed 1000 ETH max
        
        // Convert to CHIPS (1 CHIP = $0.20, so 5 CHIPS per USD)
        uint256 chipsAmount = (ethAmount * uint256(ethPriceUSD) * 5) / 1e8;
        
        require(chipsAmount > 0, "Calculated amount too small");
        
        return chipsAmount;
    }
    
    /**
     * @dev Get pool statistics
     */
    function getPoolStats() external view returns (
        uint256 totalETH,
        uint256 chipPrice,
        uint256 ethPrice
    ) {
        totalETH = address(this).balance;
        chipPrice = 1e18 / 5; // 1 CHIP = $0.20, so 0.2 ETH worth at current price
        
        (, int256 ethPriceUSD, , , ) = ethUsdPriceFeed.latestRoundData();
        ethPrice = uint256(ethPriceUSD) / 1e6; // Convert from 8 decimals to cents (2 decimals)
        
        return (totalETH, chipPrice, ethPrice);
    }
    
    /**
     * @dev Withdraw contract LINK balance (owner only)
     */
    function withdrawLINK(uint256 amount) external onlyOwner {
        uint256 contractBalance = linkToken.balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient LINK balance");
        
        // Ensure we keep enough LINK for pending VRF requests
        // This is a simple check - in production you might want more sophisticated tracking
        require(contractBalance - amount >= vrfCostLINK * 10, "Must keep LINK buffer for VRF");
        
        require(linkToken.transfer(owner(), amount), "LINK transfer failed");
        emit LINKWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Withdraw all available LINK tokens, keeping only the required buffer for VRF requests (owner only)
     */
    function withdrawAllAvailableLINK() external onlyOwner {
        uint256 contractBalance = linkToken.balanceOf(address(this));
        uint256 requiredBuffer = vrfCostLINK * 10; // Keep 10 VRF requests worth of LINK
        
        require(contractBalance > requiredBuffer, "No excess LINK to withdraw");
        
        uint256 withdrawAmount = contractBalance - requiredBuffer;
        require(linkToken.transfer(owner(), withdrawAmount), "LINK transfer failed");
        emit LINKWithdrawn(owner(), withdrawAmount);
    }
    
    /**
     * @dev Get contract LINK balance and VRF capacity
     */
    function getLINKStats() external view returns (
        uint256 contractLINKBalance,
        uint256 vrfRequestsAffordable,
        uint256 vrfCostLINKTokens,
        uint256 vrfCostUSDCents
    ) {
        contractLINKBalance = linkToken.balanceOf(address(this));
        vrfRequestsAffordable = contractLINKBalance / vrfCostLINK;
        vrfCostLINKTokens = vrfCostLINK;
        vrfCostUSDCents = _getLINKCostInUSD();
        
        return (contractLINKBalance, vrfRequestsAffordable, vrfCostLINKTokens, vrfCostUSDCents);
    }
    
    /**
     * @dev Get current dynamic pricing breakdown
     */
    function getPricingBreakdown(uint8 reelCount) external view returns (
        uint256 baseCostUSD,
        uint256 vrfCostUSD,
        uint256 reelMultiplier,
        uint256 totalCostUSD,
        uint256 totalCostCHIPS
    ) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        baseCostUSD = baseChipPriceUSD;
        vrfCostUSD = _getLINKCostInUSD();
        reelMultiplier = _getReelMultiplier(reelCount);
        totalCostUSD = ((baseCostUSD + vrfCostUSD) * reelMultiplier) / 10000;
        totalCostCHIPS = getSpinCost(reelCount);
        
        return (baseCostUSD, vrfCostUSD, reelMultiplier, totalCostUSD, totalCostCHIPS);
    }
    
    /**
     * @dev Get VRF cost info and current gas conditions
     */
    function getVRFStats() external view returns (
        uint256 currentGasPrice,
        uint256 callbackGas,
        uint256 vrfCostLINKTokens,
        uint256 vrfCostUSDCents,
        uint256 maxSlippage
    ) {
        currentGasPrice = tx.gasprice;
        callbackGas = callbackGasLimit;
        vrfCostLINKTokens = vrfCostLINK;
        vrfCostUSDCents = _getLINKCostInUSD();
        maxSlippage = maxSlippageBPS;
        
        return (currentGasPrice, callbackGas, vrfCostLINKTokens, vrfCostUSDCents, maxSlippage);
    }
} 

