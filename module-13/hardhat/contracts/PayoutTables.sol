// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title PayoutTables - Unified interface for all reel-specific payout tables
 * @dev Routes payout lookups to specialized contracts for each reel count
 * @notice Provides single API for DegenSlots to access all payout tables
 */

interface IPayoutTable {
    enum PayoutType {
        LOSE,           // 0 - No payout
        SMALL_WIN,      // 1 - 2x multiplier
        MEDIUM_WIN,     // 2 - 5x multiplier  
        BIG_WIN,        // 3 - 10x multiplier
        MEGA_WIN,       // 4 - 50x multiplier
        ULTRA_WIN,      // 5 - 100x multiplier
        SPECIAL_COMBO,  // 6 - 20x multiplier
        JACKPOT         // 7 - 50% of pool
    }
    
    function getPayoutType(uint256 combinationKey) external view returns (PayoutType);
}

contract PayoutTables {
    
    enum PayoutType {
        LOSE,           // 0 - No payout
        SMALL_WIN,      // 1 - 2x multiplier
        MEDIUM_WIN,     // 2 - 5x multiplier  
        BIG_WIN,        // 3 - 10x multiplier
        MEGA_WIN,       // 4 - 50x multiplier
        ULTRA_WIN,      // 5 - 100x multiplier
        SPECIAL_COMBO,  // 6 - 20x multiplier
        JACKPOT         // 7 - 50% of pool
    }
    
    // Specialized payout table contracts
    mapping(uint8 => IPayoutTable) public payoutTables;
    
    // Owner for upgradeability
    address public owner;
    
    event PayoutTableUpdated(uint8 indexed reelCount, address indexed newTable);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(
        address payoutTables3,
        address payoutTables4,
        address payoutTables5,
        address payoutTables6,
        address payoutTables7
    ) {
        owner = msg.sender;
        
        payoutTables[3] = IPayoutTable(payoutTables3);
        payoutTables[4] = IPayoutTable(payoutTables4);
        payoutTables[5] = IPayoutTable(payoutTables5);
        payoutTables[6] = IPayoutTable(payoutTables6);
        payoutTables[7] = IPayoutTable(payoutTables7);
    }
    
    /**
     * @dev Unified payout lookup - routes to appropriate specialized contract
     * @param reelCount Number of reels (3-7)
     * @param combinationKey The combination (e.g., 333 for triple pumps)
     * @return payoutType The payout type for this combination
     */
    function getPayoutType(uint8 reelCount, uint256 combinationKey) external view returns (PayoutType) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        IPayoutTable table = payoutTables[reelCount];
        require(address(table) != address(0), "Payout table not set");
        
        // Route to specialized contract and convert enum
        IPayoutTable.PayoutType result = table.getPayoutType(combinationKey);
        return PayoutType(uint8(result));
    }
    
    /**
     * @dev Update a specific payout table contract (for upgradeability)
     */
    function updatePayoutTable(uint8 reelCount, address newTable) external onlyOwner {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        require(newTable != address(0), "Invalid address");
        
        payoutTables[reelCount] = IPayoutTable(newTable);
        emit PayoutTableUpdated(reelCount, newTable);
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /**
     * @dev Get all payout table addresses
     */
    function getAllPayoutTables() external view returns (
        address table3,
        address table4, 
        address table5,
        address table6,
        address table7
    ) {
        return (
            address(payoutTables[3]),
            address(payoutTables[4]),
            address(payoutTables[5]),
            address(payoutTables[6]),
            address(payoutTables[7])
        );
    }
}
