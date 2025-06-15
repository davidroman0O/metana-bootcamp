// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "./interfaces/IPayoutTables.sol";
import "./interfaces/IPriceFeed.sol";
import "./interfaces/IVRFCoordinator.sol";

/**
 * @title CasinoSlot - Professional-grade on-chain slot machine with upgradeable architecture
 * @author David Roman
 * @notice Advanced casino system with Chainlink VRF, compound integration, and modular payout tables
 * @dev UUPS upgradeable contract with comprehensive admin controls and risk management
 */
contract CasinoSlot is 
    Initializable,
    ERC20Upgradeable,
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable,
    OwnableUpgradeable
{
    
    // Chainlink VRF - stored as state variables instead of immutable
    IVRFCoordinator public COORDINATOR;
    uint64 public s_subscriptionId;
    bytes32 public keyHash; // VRF key hash - identifies gas price tier and oracle selection
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;
    
    // External payout tables contract
    IPayoutTables public payoutTables;
    
    // Core game state
    IPriceFeed internal ethUsdPriceFeed;
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
    event PrizePoolUpdated(uint256 newTotal);
    event PayoutTablesUpdated(address indexed newPayoutTables);
    event ChipsPurchased(address indexed player, uint256 ethAmount, uint256 chipsAmount);
    
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
        uint64 subscriptionId,
        address ethUsdPriceFeedAddress,
        address payoutTablesAddress,
        address vrfCoordinatorAddress,
        bytes32 vrfKeyHash,
        address initialOwner
    ) public initializer {
        __ERC20_init("CasinoSlot Casino Chips", "CHIPS");
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(initialOwner);
        
        COORDINATOR = IVRFCoordinator(vrfCoordinatorAddress);
        s_subscriptionId = subscriptionId;
        ethUsdPriceFeed = IPriceFeed(ethUsdPriceFeedAddress);
        payoutTables = IPayoutTables(payoutTablesAddress);
        keyHash = vrfKeyHash;
        
        // Initialize VRF parameters
        callbackGasLimit = 200000;
        requestConfirmations = 3;
        numWords = 1;
        houseEdge = 500; // 5%
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
            payoutType: IPayoutTables.PayoutType.LOSE,
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
        (IPayoutTables.PayoutType payoutType, uint256 payout) = _calculateModeBasedPayout(spin.reelCount, reels, spin.betAmount);
        
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
            if (payoutType == IPayoutTables.PayoutType.JACKPOT) {
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
    function getPlayerStats(address player) external view returns (
        uint256 balance,
        uint256 winnings,
        uint256 spinsCount,
        uint256 totalWinnings
    ) {
        return (
            balanceOf(player),
            playerWinnings[player],
            totalSpins[player],
            totalWon[player]
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
} 

