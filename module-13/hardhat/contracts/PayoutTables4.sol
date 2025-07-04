// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./interfaces/IPayoutTables.sol";

/**
 * @title PayoutTables4 - Ultra-optimized 4-reel payout lookup
 * @dev Uses mathematical patterns + assembly for 95.76% storage reduction
 * @notice Only stores 1 winning edge cases vs 1296 total combinations
 * @notice Removed 54 LOSE cases (mappings default to 0)
 */
contract PayoutTables4 {
    // Use interface enum instead of local definition
    
    // Only store winning edge cases - LOSE cases default to 0
    mapping(uint256 => IPayoutTables.PayoutType) private edgeCases;
    
    constructor() {
        _initializeEdgeCases();
    }
    
    /**
     * @dev Ultra-optimized payout lookup: O(1) math patterns + fallback storage
     * @param combinationKey The combination (e.g., 333 for triple pumps)
     * @return payoutType The payout type for this combination
     */
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType) {
        // First check mathematical patterns for instant O(1) lookup (~95.76% of cases)
        IPayoutTables.PayoutType mathPattern = _checkMathematicalPatterns(combinationKey);
        if (mathPattern != IPayoutTables.PayoutType.LOSE) {
            return mathPattern;
        }
        
        // Fallback to edge case storage (defaults to LOSE if not found)
        return edgeCases[combinationKey];
    }
    
    /**
     * @dev Assembly-optimized mathematical pattern detection
     * @dev Covers ~95.76% of cases without storage lookup
     */
    function _checkMathematicalPatterns(uint256 combinationKey) internal pure returns (IPayoutTables.PayoutType) {
        // Extract individual reels using assembly for gas efficiency
        uint256[4] memory reels;
        uint256 temp = combinationKey;
        
        assembly {
            // Extract reels from right to left
            for { let i := 0 } lt(i, 4) { i := add(i, 1) } {
                mstore(add(reels, mul(i, 32)), mod(temp, 10))
                temp := div(temp, 10)
            }
        }
        
        // Count symbols using assembly-optimized bit packing
        uint256 counts; // Pack all counts into single uint256 (6 symbols × 4 bits each)
        
        assembly {
            for { let i := 0 } lt(i, 4) { i := add(i, 1) } {
                let reel := mload(add(reels, mul(i, 32)))
                let shift := mul(sub(reel, 1), 4) // 4 bits per symbol count
                let currentCount := and(shr(shift, counts), 0xF)
                counts := or(and(counts, not(shl(shift, 0xF))), shl(shift, add(currentCount, 1)))
            }
        }
        
        // Extract counts for analysis
        uint256 count2 = (counts >> 4) & 0xF;   // COPE count  
        uint256 count3 = (counts >> 8) & 0xF;   // PUMP count
        uint256 count4 = (counts >> 12) & 0xF;  // DIAMOND count
        uint256 count5 = (counts >> 16) & 0xF;  // ROCKET count
        uint256 count6 = (counts >> 20) & 0xF;  // JACKPOT count
        
        // All same symbol patterns
        if (count6 == 4) return IPayoutTables.PayoutType.JACKPOT;     // All jackpots
        if (count5 == 4) return IPayoutTables.PayoutType.ULTRA_WIN;   // All rockets
        if (count4 == 4) return IPayoutTables.PayoutType.MEGA_WIN;    // All diamonds
        if (count3 == 4) return IPayoutTables.PayoutType.BIG_WIN;     // All pumps
        if (count2 == 4) return IPayoutTables.PayoutType.MEDIUM_WIN;  // All copes
        
        // Almost all patterns (n-1 matching)
        if (count6 == 3) return IPayoutTables.PayoutType.SPECIAL_COMBO; // Almost jackpot
        if (count5 == 3) return IPayoutTables.PayoutType.SPECIAL_COMBO; // Almost rockets
        
        // Specific rocket patterns
        
        if (count5 == 3) return IPayoutTables.PayoutType.SPECIAL_COMBO; // Three rockets
        
        // Mixed high-value combinations
        if (count4 >= 2 && count5 >= 1) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        if (count5 >= 2 && count4 >= 1) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        
        // Triple patterns
        if (count6 >= 3) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count5 >= 3) return IPayoutTables.PayoutType.BIG_WIN;
        if (count4 >= 3) return IPayoutTables.PayoutType.BIG_WIN;
        if (count3 >= 3) return IPayoutTables.PayoutType.MEDIUM_WIN;
        if (count2 >= 3) return IPayoutTables.PayoutType.MEDIUM_WIN;
        
        
        // 4+ reel quadruple patterns
        if (count6 >= 4) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count5 >= 4) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count4 >= 4) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count3 >= 4) return IPayoutTables.PayoutType.BIG_WIN;
        if (count2 >= 4) return IPayoutTables.PayoutType.BIG_WIN;
        
        // Pair patterns: Only high-value symbols pay on pairs
        if (count6 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // Jackpot pairs
        if (count5 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // Rocket pairs
        if (count4 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // Diamond pairs
        if (count3 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // PUMP pairs
        if (count2 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // COPE pairs
        
        return IPayoutTables.PayoutType.LOSE; // No pattern matched
    }
    
    /**
     * @dev Initialize only winning edge cases - LOSE cases omitted (default to 0)
     */
    function _initializeEdgeCases() internal {
        // MEDIUM_WIN edge cases (1 total)
        edgeCases[1111] = IPayoutTables.PayoutType.MEDIUM_WIN;
    }
}
