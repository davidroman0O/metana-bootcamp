// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPayoutTables.sol";

/**
 * @title PayoutTables - Unified API for all reel configurations
 * @dev Routes payout lookups to specialized contracts based on reel count
 * @notice Supports 3-7 reels with different optimization strategies
 */
contract PayoutTables is Ownable, IPayoutTables {
    
    // Sub-table contracts for each reel count
    IPayoutTable3 public table3;
    IPayoutTable4 public table4;
    IPayoutTable5 public table5;
    IPayoutTable6 public table6;
    IPayoutTable7 public table7;
    
    event PayoutTableUpdated(uint8 indexed reelCount, address indexed newTable);
    
    constructor(
        address payoutTables3,
        address payoutTables4,
        address payoutTables5,
        address payoutTables6,
        address payoutTables7
    ) Ownable(msg.sender) {
        table3 = IPayoutTable3(payoutTables3);
        table4 = IPayoutTable4(payoutTables4);
        table5 = IPayoutTable5(payoutTables5);
        table6 = IPayoutTable6(payoutTables6);
        table7 = IPayoutTable7(payoutTables7);
    }
    
    /**
     * @dev Unified payout lookup - routes to appropriate specialized contract
     * @param reelCount Number of reels (3-7)
     * @param combinationKey The combination (e.g., 333 for triple pumps)
     * @return payoutType The payout type for this combination
     */
    function getPayoutType(uint8 reelCount, uint256 combinationKey) external view returns (PayoutType) {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        
        if (reelCount == 3) {
            require(address(table3) != address(0), "Table3 not set");
            return table3.getPayoutType(combinationKey);
        } else if (reelCount == 4) {
            require(address(table4) != address(0), "Table4 not set");
            return table4.getPayoutType(combinationKey);
        } else if (reelCount == 5) {
            require(address(table5) != address(0), "Table5 not set");
            return table5.getPayoutType(combinationKey);
        } else if (reelCount == 6) {
            require(address(table6) != address(0), "Table6 not set");
            return table6.getPayoutType(combinationKey);
        } else if (reelCount == 7) {
            require(address(table7) != address(0), "Table7 not set");
            return table7.getPayoutType(combinationKey);
        }
        
        revert("Invalid reel count");
    }
    
    /**
     * @dev Update a specific payout table contract (for upgradeability)
     */
    function updatePayoutTable(uint8 reelCount, address newTable) external onlyOwner {
        require(reelCount >= 3 && reelCount <= 7, "Invalid reel count");
        require(newTable != address(0), "Invalid address");
        
        if (reelCount == 3) {
            table3 = IPayoutTable3(newTable);
        } else if (reelCount == 4) {
            table4 = IPayoutTable4(newTable);
        } else if (reelCount == 5) {
            table5 = IPayoutTable5(newTable);
        } else if (reelCount == 6) {
            table6 = IPayoutTable6(newTable);
        } else if (reelCount == 7) {
            table7 = IPayoutTable7(newTable);
        }
        
        emit PayoutTableUpdated(reelCount, newTable);
    }
    
    /**
     * @dev Get all payout table addresses
     */
    function getAllPayoutTables() external view returns (
        address payoutTable3,
        address payoutTable4, 
        address payoutTable5,
        address payoutTable6,
        address payoutTable7
    ) {
        return (
            address(table3),
            address(table4),
            address(table5),
            address(table6),
            address(table7)
        );
    }
}

// Individual table interfaces for type safety
interface IPayoutTable3 {
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType);
}

interface IPayoutTable4 {
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType);
}

interface IPayoutTable5 {
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType);
}

interface IPayoutTable6 {
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType);
}

interface IPayoutTable7 {
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType);
}
