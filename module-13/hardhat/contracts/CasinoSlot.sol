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
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// VRF Wrapper interface for direct funding with native payment
interface IVRFV2PlusWrapper {
    function requestRandomWordsInNative(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes memory extraArgs
    ) external payable returns (uint256 requestId);
    
    function calculateRequestPriceNative(
        uint32 _callbackGasLimit,
        uint32 _numWords
    ) external view returns (uint256);
}

/**
 * @title CasinoSlot 
 * @author David Roman
 * @dev UUPS upgradeable contract with native ETH VRF payment
 */
contract CasinoSlot is 
    Initializable,
    ERC20Upgradeable,
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable,
    OwnableUpgradeable
{
    
    // Chainlink VRF Direct Funding with Native Payment
    IVRFV2PlusWrapper public vrfWrapper;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;
    
    // Mark-up applied on top of the raw VRF cost returned by the wrapper.
    // Example: 1500 = +15 %. Helps the house remain profitable even when gas/LINK prices fluctuate.
    uint256 public vrfMarkupBP;
    
    // External contracts
    IPayoutTables public payoutTables;
    IPriceFeed internal ethUsdPriceFeed;
    
    // Core game state
    uint256 public totalPrizePool;
    uint256 public houseEdge; // 5% (500 basis points)
    
    // Economic parameters
    uint256 public baseChipPriceUSD; // Base CHIP price in cents (e.g., 20 = $0.20)
    uint256 public vrfCostUSD; // VRF cost in USD cents (e.g., 500 = $5.00)
    
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
    // 0: SPIN_CONTRIBUTION, 1: JACKPOT_PAYOUT, 2: ETH_DEPOSIT, 3: VRF_PAYMENT
    event PrizePoolStateChanged(uint256 newTotalPrizePool, int256 amount, uint8 indexed reason);
    event PayoutTablesUpdated(address indexed newPayoutTables);
    event ChipsPurchased(address indexed player, uint256 ethAmount, uint256 chipsAmount);
    event EthWithdrawn(address indexed owner, uint256 amount);
    event HouseFeeCollected(uint256 indexed requestId, address indexed player, uint256 amount);
    event PlayerStatsUpdated(address indexed player, uint256 totalSpins, uint256 totalWinnings, uint256 totalBet);
    event ContractInitialized(uint8 version);
    event WinningsCredited(address indexed player, uint256 amount);
    event VRFCostUpdated(uint256 newVrfCostUSD);
    event DynamicPricingUpdated(uint256 baseChipPriceUSD, uint256 vrfCostUSD);
    event VRFPayment(uint256 indexed requestId, uint256 ethPaid);
    event VRFMarkupUpdated(uint256 newVrfMarkupBP);
    event ChipsSwapped(address indexed player, uint256 chipsAmount, uint256 ethValue);
    
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
        address payoutTablesAddress,
        address wrapperAddress,
        address initialOwner
    ) public initializer {
        __ERC20_init("CasinoSlot Casino Chips", "CHIPS");
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(initialOwner);
        
        vrfWrapper = IVRFV2PlusWrapper(wrapperAddress);
        ethUsdPriceFeed = IPriceFeed(ethUsdPriceFeedAddress);
        payoutTables = IPayoutTables(payoutTablesAddress);
        
        // Initialize VRF parameters  
        callbackGasLimit = 500000; // Increased for complex fulfillment logic
        requestConfirmations = 3;
        numWords = 1;
        houseEdge = 500; // 5%
        
        // Initialize economic parameters
        baseChipPriceUSD = 20; // $0.20 in cents
        vrfCostUSD = 600; // $6.00 in cents - dynamic cost
        vrfMarkupBP = 1500; // 15 % markup on VRF cost (basis-points)
        
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
        uint256 newVrfCostUSD
    ) external onlyOwner {
        require(newBaseChipPriceUSD > 0 && newBaseChipPriceUSD <= 10000, "Invalid base price"); // Max $100
        require(newVrfCostUSD > 0 && newVrfCostUSD <= 5000, "Invalid VRF cost"); // Max $50
        
        baseChipPriceUSD = newBaseChipPriceUSD;
        vrfCostUSD = newVrfCostUSD;
        
        emit DynamicPricingUpdated(newBaseChipPriceUSD, newVrfCostUSD);
    }
    
    /**
     * @dev Get the dynamic cost for a specific reel mode in CHIPS
     * Formula: (Base Cost + VRF Cost) × Reel Multiplier
     */
    function getSpinCost(uint8 reelCount) public view returns (uint256) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        // Base cost in USD cents
        uint256 baseCostUSD = baseChipPriceUSD;
        
        // Add VRF cost (already in USD)
        uint256 vrfCostInUSD = _getVRFCostInUSD();
        
        // Total base cost
        uint256 totalBaseCostUSD = baseCostUSD + vrfCostInUSD;
        
        // Apply reel scaling multiplier
        uint256 reelMultiplier = _getReelMultiplier(reelCount);
        uint256 scaledCostUSD = (totalBaseCostUSD * reelMultiplier) / 10000;
        
        // chipsPerUSD (18-dec) = 100 cents / baseChipPriceUSD
        uint256 chipsPerUSD = (100 * 1e18) / baseChipPriceUSD;
        uint256 costInCHIPS = (scaledCostUSD * chipsPerUSD) / 100;
        
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
     * @dev Get VRF cost in USD cents (dynamic pricing)
     */
    function _getVRFCostInUSD() internal view virtual returns (uint256) {
        // 1. Ask the wrapper for the exact ETH fee for this request size
        uint256 priceETH = vrfWrapper.calculateRequestPriceNative(
            callbackGasLimit,
            numWords
        );

        // 2. Convert that ETH fee → USD cents using Chainlink price feed
        (, int256 ethPriceUSD, , , ) = ethUsdPriceFeed.latestRoundData();
        uint256 rawCostUSD;
        if (priceETH > 0 && ethPriceUSD > 0) {
            // priceETH is in wei (1e18) and ethPriceUSD has 8 decimals.
            // USD cents = (wei * USD(8dec) * 100) / 1e26
            rawCostUSD = (priceETH * uint256(ethPriceUSD) * 100) / 1e26;
        }

        // 3. Fallback to the manually configured vrfCostUSD if wrapper returns 0 (local chain)
        if (rawCostUSD == 0) {
            rawCostUSD = vrfCostUSD;
        }

        // 4. Add house markup so we always earn on the request itself
        uint256 markup = (rawCostUSD * vrfMarkupBP) / 10000;
        return rawCostUSD + markup;
    }
    
    /**
     * @dev Convert USD cents to ETH dynamically
     */
    function _convertUSDCentsToETH(uint256 usdCents) internal view returns (uint256) {
        (, int256 ethPriceUSD, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        
        // Validate ETH price
        require(ethPriceUSD > 0, "Invalid ETH price");
        if (block.chainid != 31337) { // Skip stale check on local network
            require(block.timestamp - updatedAt <= 3600*24, "ETH price data stale");
        }
        require(uint256(ethPriceUSD) >= 50 * 1e8, "ETH price too low"); // Min $50
        require(uint256(ethPriceUSD) <= 100000 * 1e8, "ETH price too high"); // Max $100K
        
        // Convert: USD cents ÷ (USD/ETH) ÷ 100 (cents to dollars)
        uint256 ethValue = (usdCents * 1e18 * 1e8) / (uint256(ethPriceUSD) * 100);
        
        return ethValue;
    }
    
    /**
     * @dev Internal function to request random words with ETH payment
     */
    function _requestRandomWordsWithETH() internal virtual returns (uint256 requestId, uint256 price) {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );
        
        price = vrfWrapper.calculateRequestPriceNative(callbackGasLimit, numWords);
        
        // If price is zero, calculate from USD cost or use fallback
        if (price == 0) {
            uint256 calculatedPrice = _convertUSDCentsToETH(_getVRFCostInUSD());
            price = calculatedPrice > 0 ? calculatedPrice : 0.002 ether; // Fallback
        }
        
        // Make sure we have enough ETH
        require(address(this).balance >= price, "Insufficient ETH balance");
        
        // Call the wrapper with ETH
        requestId = vrfWrapper.requestRandomWordsInNative{value: price}(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
        
        return (requestId, price);
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
        
        // Cost volatility check: ensure the provided cost is close to the current on-chain calculated cost
        uint256 currentCost = getSpinCost(reelCount);
        uint256 difference = (cost > currentCost) ? cost - currentCost : currentCost - cost;
        // Allow up to a 5% difference to account for minor price oracle fluctuations
        require(difference * 100 / currentCost <= 500, "Price has changed, please retry");
        
        require(balanceOf(msg.sender) >= cost, "Insufficient CHIPS");
        require(address(this).balance > 0, "No ETH balance");

        // Burn CHIPS from player 
        _burn(msg.sender, cost);
        
        // Calculate ETH value of burned CHIPS and the cost of the VRF in a single pass
        uint256 vrfCostInUSD = _getVRFCostInUSD();
        uint256 ethForVRF = _convertUSDCentsToETH(vrfCostInUSD);
        uint256 ethValue = calculateETHFromCHIPS(cost);

        require(ethValue > ethForVRF, "ETH value of CHIPS is less than VRF cost");
        require(address(this).balance >= ethForVRF, "Insufficient ETH for VRF");
        
        // Calculate remaining ETH after VRF payment
        uint256 remainingETH = ethValue - ethForVRF;
        
        // Apply house edge to remaining ETH
        uint256 houseAmount = (remainingETH * houseEdge) / 10000;
        uint256 prizePoolAmount = remainingETH - houseAmount;
        
        // Add to prize pool
        totalPrizePool += prizePoolAmount;
        emit PrizePoolStateChanged(totalPrizePool, int256(prizePoolAmount), 0);
        
        // VRF checks
        require(address(vrfWrapper) != address(0), "VRF wrapper zero");
        
        // Native ETH payment for VRF request
        uint256 vrfPrice;
        (requestId, vrfPrice) = _requestRandomWordsWithETH();
        
        require(requestId > 0, "VRF request failed");
        
        // Reset allowance to 0 after spin to force re-approval next time
        _approve(msg.sender, address(this), 0);

        emit HouseFeeCollected(requestId, msg.sender, houseAmount);
        emit VRFPayment(requestId, vrfPrice);
        
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
     * @dev Swap CHIPS back to ETH
     */
    function swapChipsToETH(uint256 chipsAmount) external nonReentrant {
        require(chipsAmount > 0, "Must specify CHIPS amount");
        require(balanceOf(msg.sender) >= chipsAmount, "Insufficient CHIPS balance");
        
        // Calculate ETH equivalent
        uint256 ethValue = calculateETHFromCHIPS(chipsAmount);
        require(ethValue > 0, "ETH calculation failed");
        require(address(this).balance >= ethValue, "Insufficient contract ETH balance");
        
        // Burn CHIPS from user
        _burn(msg.sender, chipsAmount);
        
        // Update prize pool (ETH is leaving the pool)
        if (totalPrizePool >= ethValue) {
            totalPrizePool -= ethValue;
        } else {
            totalPrizePool = 0;
        }
        emit PrizePoolStateChanged(totalPrizePool, -int256(ethValue), 2);
        
        // Transfer ETH to user
        payable(msg.sender).transfer(ethValue);
        
        emit ChipsSwapped(msg.sender, chipsAmount, ethValue);
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
        uint256 chipsAmount = (ethAmount * uint256(ethPriceUSD) * 100) / (1e8 * baseChipPriceUSD);
        
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
        chipPrice = (baseChipPriceUSD * 1e18) / 100; // Price of one CHIP in wei assuming 1 CHIP = baseChipPriceUSD cents.
        
        (, int256 ethPriceUSD, , , ) = ethUsdPriceFeed.latestRoundData();
        ethPrice = uint256(ethPriceUSD) / 1e6; // Convert from 8 decimals to cents (2 decimals)
        
        return (totalETH, chipPrice, ethPrice);
    }
    
    /**
     * @dev Get current dynamic pricing breakdown
     */
    function getPricingBreakdown(uint8 reelCount) external view returns (
        uint256 baseCostUSD,
        uint256 vrfCostInUSD,
        uint256 reelMultiplier,
        uint256 totalCostUSD,
        uint256 totalCostCHIPS
    ) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        baseCostUSD = baseChipPriceUSD;
        vrfCostInUSD = _getVRFCostInUSD();
        reelMultiplier = _getReelMultiplier(reelCount);
        totalCostUSD = ((baseCostUSD + vrfCostInUSD) * reelMultiplier) / 10000;
        totalCostCHIPS = getSpinCost(reelCount);
        
        return (baseCostUSD, vrfCostInUSD, reelMultiplier, totalCostUSD, totalCostCHIPS);
    }
    
    /**
     * @dev Get VRF cost info and current gas conditions
     */
    function getVRFStats() external view returns (
        uint256 currentGasPrice,
        uint256 callbackGas,
        uint256 vrfCostETHTokens,
        uint256 vrfCostUSDCents,
        uint256 ethBalance
    ) {
        currentGasPrice = tx.gasprice;
        callbackGas = callbackGasLimit;
        vrfCostETHTokens = _convertUSDCentsToETH(_getVRFCostInUSD());
        vrfCostUSDCents = _getVRFCostInUSD();
        ethBalance = address(this).balance;
        
        return (currentGasPrice, callbackGas, vrfCostETHTokens, vrfCostUSDCents, ethBalance);
    }
    
    /**
     * @dev Get ETH balance and VRF capacity
     */
    function getETHStats() external view returns (
        uint256 contractETHBalance,
        uint256 vrfRequestsAffordable,
        uint256 vrfCostETHTokens,
        uint256 vrfCostUSDCents
    ) {
        contractETHBalance = address(this).balance;
        vrfCostETHTokens = _convertUSDCentsToETH(_getVRFCostInUSD());
        vrfRequestsAffordable = vrfCostETHTokens > 0 ? contractETHBalance / vrfCostETHTokens : 0;
        vrfCostUSDCents = _getVRFCostInUSD();
        
        return (contractETHBalance, vrfRequestsAffordable, vrfCostETHTokens, vrfCostUSDCents);
    }
    
    /**
     * @dev Update VRF parameters (only owner)
     */
    function updateVRFParameters(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        uint256 _vrfCostUSD,
        uint256 _vrfMarkupBP
    ) external onlyOwner {
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
        vrfCostUSD = _vrfCostUSD;
        vrfMarkupBP = _vrfMarkupBP;
        
        emit VRFCostUpdated(_vrfCostUSD);
        emit VRFMarkupUpdated(_vrfMarkupBP);
    }
} 

