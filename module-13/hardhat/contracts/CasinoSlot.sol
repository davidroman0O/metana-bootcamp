// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IPayoutTables.sol";
import "./interfaces/ICompound.sol";

/**
 * @title CasinoSlot - Casino & ERC20 Token Combined
 * @dev Upgradeable slot machine that IS the CHIPS token itself
 * @notice Users buy CHIPS with ETH, spend CHIPS on spins, win more CHIPS
 */
contract CasinoSlot is 
    Initializable,
    ERC20Upgradeable,
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable,
    OwnableUpgradeable 
{
    
    enum PayoutType {
        LOSE,           // 0 - No payout
        SMALL_WIN,      // 1 - 2x multiplier
        MEDIUM_WIN,     // 2 - 5x multiplier  
        BIG_WIN,        // 3 - 10x multiplier
        MEGA_WIN,       // 4 - 50x multiplier
        ULTRA_WIN,      // 5 - 100x multiplier
        SPECIAL_COMBO,  // 6 - 20x multiplier
        JACKPOT         // 7 - 25% of pool
    }
    
    struct Spin {
        address player;
        uint256 betAmount;
        uint8 reelCount;      // Number of reels for this spin
        uint256[] reels;      // Dynamic array for reel results
        PayoutType payoutType;
        uint256 payout;
        bool settled;
        uint256 timestamp;
    }
    
    // Chainlink VRF - stored as state variables instead of immutable
    VRFCoordinatorV2Interface public COORDINATOR;
    uint64 public s_subscriptionId;
    bytes32 public keyHash; // VRF key hash - identifies gas price tier and oracle selection
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;
    
    // External payout tables contract
    IPayoutTables public payoutTables;
    
    // Compound integration for leveraged gambling
    ICToken public cEth;
    IComptroller public comptroller;
    
    // Core game state
    AggregatorV3Interface internal ethUsdPriceFeed;
    uint256 public totalPrizePool;
    uint256 public houseEdge; // 5% (500 basis points)
    
    // Fixed costs for each reel mode (in CHIPS)
    uint256 public constant COST_3_REELS = 1 * 10**18;      // 1 CHIPS ($0.20)
    uint256 public constant COST_4_REELS = 10 * 10**18;     // 10 CHIPS ($2.00)
    uint256 public constant COST_5_REELS = 100 * 10**18;    // 100 CHIPS ($20.00)
    uint256 public constant COST_6_REELS = 500 * 10**18;    // 500 CHIPS ($100.00)
    uint256 public constant COST_7_REELS = 1000 * 10**18;   // 1000 CHIPS ($200.00)
    
    // Game mappings and state
    mapping(uint256 => Spin) public spins;
    mapping(address => uint256) public playerWinnings;
    mapping(address => uint256) public totalSpins;
    mapping(address => uint256) public totalWon;
    
    // Compound borrowing tracking
    mapping(address => uint256) public borrowedETH;
    
    // Internal Collateral Tracking
    mapping(address => uint256) public userCollateralETH; // Track each user's ETH collateral
    uint256 public totalCollateralETH; // Total ETH deposited by all users
    uint256 public collateralFactor; // Collateral factor (adjustable)
    bool private compoundMarketsEntered; // Track if we've entered Compound markets
    
    // Events
    event SpinRequested(uint256 indexed requestId, address indexed player, uint8 reelCount, uint256 betAmount);
    event SpinResult(
        uint256 indexed requestId, 
        address indexed player, 
        uint8 reelCount,
        uint256[] reels, 
        PayoutType payoutType, 
        uint256 payout
    );
    event WinningsWithdrawn(address indexed player, uint256 amount);
    event PrizePoolUpdated(uint256 newTotal);
    event PayoutTablesUpdated(address indexed newPayoutTables);
    
    // Compound integration events
    event CollateralDeposited(address indexed player, uint256 ethAmount, uint256 cTokensMinted);
    event ChipsBorrowed(address indexed player, uint256 ethAmount, uint256 chipsAmount);
    event LoanRepaid(address indexed player, uint256 chipsAmount, uint256 ethAmount);
    event ETHRepayment(address indexed player, uint256 ethAmount);
    event ChipsPurchased(address indexed player, uint256 ethAmount, uint256 chipsAmount);
    event CollateralWithdrawn(address indexed player, uint256 ethAmount, uint256 cEthRedeemed);
    event CollateralFactorUpdated(uint256 newFactor);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the contract (replaces constructor for upgradeable pattern)
     */
    function initialize(
        uint64 subscriptionId,
        address ethUsdPriceFeedAddress,
        address payoutTablesAddress,
        address vrfCoordinatorAddress,
        bytes32 vrfKeyHash,
        address cEthAddress,
        address comptrollerAddress,
        address initialOwner
    ) public initializer {
        __ERC20_init("CasinoSlot Casino Chips", "CHIPS");
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(initialOwner);
        
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinatorAddress);
        s_subscriptionId = subscriptionId;
        ethUsdPriceFeed = AggregatorV3Interface(ethUsdPriceFeedAddress);
        payoutTables = IPayoutTables(payoutTablesAddress);
        keyHash = vrfKeyHash;
        
        // Initialize Compound integration
        cEth = ICToken(cEthAddress);
        comptroller = IComptroller(comptrollerAddress);
        
        // Initialize VRF parameters
        callbackGasLimit = 200000;
        requestConfirmations = 3;
        numWords = 1;
        houseEdge = 500; // 5%
        
        // Initialize
        collateralFactor = 75; // 75% collateral factor
        compoundMarketsEntered = false;
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
     * @dev Get the cost for a specific reel mode
     */
    function getSpinCost(uint8 reelCount) public pure returns (uint256) {
        if (reelCount == 3) return COST_3_REELS;
        if (reelCount == 4) return COST_4_REELS;
        if (reelCount == 5) return COST_5_REELS;
        if (reelCount == 6) return COST_6_REELS;
        if (reelCount == 7) return COST_7_REELS;
        revert("Invalid reel count");
    }
    
    /**
     * @dev Spin 3 reels (classic mode) - 1 CHIPS
     */
    function spin3Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        return _executeSpin(3, COST_3_REELS);
    }
    
    /**
     * @dev Spin 4 reels (expanded mode) - 10 CHIPS  
     */
    function spin4Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        return _executeSpin(4, COST_4_REELS);
    }
    
    /**
     * @dev Spin 5 reels (premium mode) - 100 CHIPS
     */
    function spin5Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        return _executeSpin(5, COST_5_REELS);
    }
    
    /**
     * @dev Spin 6 reels (high roller mode) - 500 CHIPS
     */
    function spin6Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        return _executeSpin(6, COST_6_REELS);
    }
    
    /**
     * @dev Spin 7 reels (whale mode) - 1000 CHIPS
     */
    function spin7Reels() external nonReentrant whenNotPaused returns (uint256 requestId) {
        return _executeSpin(7, COST_7_REELS);
    }
    
    /**
     * @dev Internal function to execute a spin for any reel count
     */
    function _executeSpin(uint8 reelCount, uint256 cost) internal returns (uint256 requestId) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        // Check player has enough CHIPS
        require(balanceOf(msg.sender) >= cost, "Insufficient CHIPS balance");
        
        // Burn CHIPS from player (casino keeps ETH equivalent in prize pool)
        _burn(msg.sender, cost);
        
        // Add to prize pool (minus house edge)
        uint256 houseAmount = (cost * houseEdge) / 10000;
        uint256 prizeAmount = cost - houseAmount;
        totalPrizePool += prizeAmount;
        
        // Request randomness
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        // Store spin data
        spins[requestId] = Spin({
            player: msg.sender,
            betAmount: cost,
            reelCount: reelCount,
            reels: new uint256[](reelCount), // Initialize empty array
            payoutType: PayoutType.LOSE,
            payout: 0,
            settled: false,
            timestamp: block.timestamp
        });
        
        totalSpins[msg.sender]++;
        
        emit SpinRequested(requestId, msg.sender, reelCount, cost);
        return requestId;
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
    function _calculateModeBasedPayout(uint8 reelCount, uint256[] memory reels, uint256 betAmount) internal view returns (PayoutType, uint256) {
        // Convert reels array to combination key (e.g., [3,3,3] -> 333)
        uint256 combinationKey = 0;
        for (uint8 i = 0; i < reels.length; i++) {
            combinationKey = combinationKey * 10 + reels[i];
        }
        
        // Get payout type from external contract
        IPayoutTables.PayoutType externalPayoutType = payoutTables.getPayoutType(reelCount, combinationKey);
        PayoutType payoutType = PayoutType(uint8(externalPayoutType));
        
        // Calculate payout amount
        uint256 payout = 0;
        
        if (payoutType == PayoutType.SMALL_WIN) {
            payout = betAmount * 2;
        } else if (payoutType == PayoutType.MEDIUM_WIN) {
            payout = betAmount * 5;
        } else if (payoutType == PayoutType.BIG_WIN) {
            payout = betAmount * 10;
        } else if (payoutType == PayoutType.SPECIAL_COMBO) {
            payout = betAmount * 20;
        } else if (payoutType == PayoutType.MEGA_WIN) {
            payout = betAmount * 50;
        } else if (payoutType == PayoutType.ULTRA_WIN) {
            payout = betAmount * 100;
        } else if (payoutType == PayoutType.JACKPOT) {
            // SECURITY: Reduced from 50% to 25% to prevent excessive prize pool draining
            payout = totalPrizePool / 4; // 25% of prize pool for jackpot
        }
        
        return (payoutType, payout);
    }
    
    /**
     * @dev Chainlink VRF callback - called directly by VRF Coordinator
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == address(COORDINATOR), "Only VRFCoordinator can fulfill");
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
        (PayoutType payoutType, uint256 payout) = _calculateModeBasedPayout(spin.reelCount, reels, spin.betAmount);
        
        // Update spin data
        spin.reels = reels;
        spin.payoutType = payoutType;
        spin.payout = payout;
        spin.settled = true;
        
        // Award winnings if any
        if (payout > 0) {
            playerWinnings[spin.player] += payout;
            totalWon[spin.player] += payout;
            
            // For jackpot, reduce the prize pool
            if (payoutType == PayoutType.JACKPOT) {
                totalPrizePool -= payout;
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
        payable(owner()).transfer(amount);
    }
    
    /**
     * @dev Get player statistics
     */
    function getPlayerStats(address player) external view virtual returns (
        uint256 balance,
        uint256 winnings,
        uint256 spinsCount,
        uint256 totalWinnings,
        uint256 borrowedAmount,
        uint256 accountLiquidity
    ) {
        // Use internal tracking for liquidity
        uint256 userCollateral = userCollateralETH[player];
        uint256 userDebt = borrowedETH[player];
        uint256 liquidity = 0;
        
        if (userCollateral > 0) {
            uint256 maxBorrowable = userCollateral * collateralFactor / 100;
            if (userDebt < maxBorrowable) {
                liquidity = maxBorrowable - userDebt;
            }
        }
        
        return (
            balanceOf(player),
            playerWinnings[player],
            totalSpins[player],
            totalWon[player],
            borrowedETH[player],
            liquidity
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
        emit PrizePoolUpdated(totalPrizePool);
    }
    
    // ============ COMPOUND INTEGRATION ============
    
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
        
        emit ChipsPurchased(msg.sender, msg.value, chipsAmount);
    }
    
    /**
     * @dev Deposit ETH as collateral to enable borrowing
     */
    function depositCollateral() external payable virtual nonReentrant {
        require(msg.value > 0, "Must deposit ETH");
        
        // Enter Compound markets once (first time only)
        if (!compoundMarketsEntered) {
            address[] memory markets = new address[](1);
            markets[0] = address(cEth);
            comptroller.enterMarkets(markets);
            compoundMarketsEntered = true;
        }
        
        // Mint cETH tokens to THIS CONTRACT 
        cEth.mint{value: msg.value}();
        
        // Track user's collateral contribution internally
        userCollateralETH[msg.sender] += msg.value;
        totalCollateralETH += msg.value;
        
        // Get current cETH balance of the contract for event
        uint256 contractCEthBalance = cEth.balanceOf(address(this));
        
        emit CollateralDeposited(msg.sender, msg.value, contractCEthBalance);
    }
    
    /**
     * @dev Borrow CHIPS against ETH collateral
     */
    function borrowChips(uint256 ethAmount) external virtual nonReentrant {
        require(ethAmount > 0, "Must borrow positive amount");
        
        // Check user's available collateral liquidity (internal tracking)
        uint256 userCollateral = userCollateralETH[msg.sender];
        uint256 userDebt = borrowedETH[msg.sender];
        uint256 availableLiquidity = (userCollateral * collateralFactor / 100) - userDebt;
        
        require(availableLiquidity >= ethAmount, "Insufficient collateral");
        
        // Calculate CHIPS amount based on ETH price
        uint256 chipsAmount = calculateChipsFromETH(ethAmount);
        
        // Ensure contract has enough CHIPS to lend
        require(balanceOf(address(this)) >= chipsAmount, "Insufficient CHIPS in contract");
        
        // Track the borrowed amount
        borrowedETH[msg.sender] += ethAmount;
        
        // Transfer CHIPS from contract to borrower
        _transfer(address(this), msg.sender, chipsAmount);
        
        emit ChipsBorrowed(msg.sender, ethAmount, chipsAmount);
    }
    
    /**
     * @dev Repay loan with CHIPS
     */
    function repayLoan(uint256 chipsAmount) external nonReentrant {
        require(chipsAmount > 0, "Must repay positive amount");
        require(borrowedETH[msg.sender] > 0, "No outstanding loan");
        require(balanceOf(msg.sender) >= chipsAmount, "Insufficient CHIPS balance");
        
        // Calculate ETH equivalent of CHIPS
        uint256 ethEquivalent = calculateETHFromChips(chipsAmount);
        require(ethEquivalent <= borrowedETH[msg.sender], "Repayment exceeds loan");
        
        // Burn CHIPS from borrower
        _burn(msg.sender, chipsAmount);
        
        // Reduce borrowed amount
        borrowedETH[msg.sender] -= ethEquivalent;
        
        emit LoanRepaid(msg.sender, chipsAmount, ethEquivalent);
    }
    
    /**
     * @dev Repay loan with ETH directly 
     */
    function repayLoanWithETH() external payable virtual nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(borrowedETH[msg.sender] > 0, "No outstanding loan");
        require(msg.value <= borrowedETH[msg.sender], "Repayment exceeds loan");
        
        // Reduce borrowed amount
        borrowedETH[msg.sender] -= msg.value;
        
        emit ETHRepayment(msg.sender, msg.value);
    }
    
    /**
     * @dev Get account liquidity for borrowing 
     */
    function getAccountLiquidity(address account) external view virtual returns (uint256) {
        uint256 userCollateral = userCollateralETH[account];
        uint256 userDebt = borrowedETH[account];
        
        if (userCollateral == 0) return 0;
        
        uint256 maxBorrowable = userCollateral * collateralFactor / 100;
        if (userDebt >= maxBorrowable) return 0;
        
        return maxBorrowable - userDebt;
    }
    
    /**
     * @dev Calculate CHIPS amount from ETH amount
     */
    function calculateChipsFromETH(uint256 ethAmount) public view returns (uint256) {
        // Get ETH price in USD (with 8 decimals from Chainlink)
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        
        // Standard Chainlink validation - simple and fixed
        require(ethPriceUSD > 0, "Invalid ETH price");
        require(block.timestamp - updatedAt <= 3600*24, "Price data stale"); // Fixed 24 hour for now because i need to code and test things
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
     * @dev Calculate ETH amount from CHIPS amount  
     */
    function calculateETHFromChips(uint256 chipsAmount) public view returns (uint256) {
        // Get ETH price in USD
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        
        
        require(ethPriceUSD > 0, "Invalid ETH price");
        require(block.timestamp - updatedAt <= 3600, "Price data stale"); // Fixed 1 hour
        require(uint256(ethPriceUSD) >= 50 * 1e8, "ETH price too low"); // Fixed $50 minimum
        require(uint256(ethPriceUSD) <= 100000 * 1e8, "ETH price too high"); // Fixed $100K maximum
        
        require(chipsAmount > 0, "CHIPS amount must be positive");
        
        // Convert CHIPS to USD (1 CHIP = $0.20, so divide by 5)
        uint256 ethAmount = (chipsAmount * 1e8) / (uint256(ethPriceUSD) * 5);
        
        return ethAmount;
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
     * @dev Withdraw collateral 
     */
    function withdrawCollateral(uint256 ethAmount) external nonReentrant {
        require(ethAmount > 0, "Must withdraw positive amount");
        require(userCollateralETH[msg.sender] >= ethAmount, "Insufficient collateral balance");
        require(borrowedETH[msg.sender] == 0, "Must repay all loans first");
        
        // Update internal tracking
        userCollateralETH[msg.sender] -= ethAmount;
        totalCollateralETH -= ethAmount;
        
        // Calculate cETH to redeem (use current exchange rate)
        uint256 exchangeRate = cEth.exchangeRateStored();
        uint256 cEthToRedeem = (ethAmount * 1e18) / exchangeRate;
        
        // Redeem ETH from Compound
        require(cEth.redeemUnderlying(ethAmount) == 0, "Compound redeem failed");
        
        // Transfer ETH to user
        payable(msg.sender).transfer(ethAmount);
        
        emit CollateralWithdrawn(msg.sender, ethAmount, cEthToRedeem);
    }
    
    /**
     * @dev Set collateral factor (Owner only)
     */
    function setCollateralFactor(uint256 newFactor) external onlyOwner {
        require(newFactor <= 95, "Collateral factor too high"); // Max 95%
        require(newFactor >= 50, "Collateral factor too low");   // Min 50%
        collateralFactor = newFactor;
        emit CollateralFactorUpdated(newFactor);
    }
    
    /**
     * @dev Get contract's total Compound position
     */
    function getCompoundPosition() external view returns (
        uint256 contractCEthBalance,
        uint256 exchangeRate,
        uint256 underlyingETH
    ) {
        contractCEthBalance = cEth.balanceOf(address(this));
        exchangeRate = cEth.exchangeRateStored();
        underlyingETH = (contractCEthBalance * exchangeRate) / 1e18;
        
        return (contractCEthBalance, exchangeRate, underlyingETH);
    }
} 

