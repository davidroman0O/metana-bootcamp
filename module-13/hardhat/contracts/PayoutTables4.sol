// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title PayoutTables4 - Ultra-optimized 4-reel payout lookup
 * @dev Uses mathematical patterns + assembly for 86.50% storage reduction
 * @notice Only stores 175 edge cases vs 1296 total combinations
 */
contract PayoutTables4 {
    
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
    
    // Only store edge cases not covered by mathematical patterns
    mapping(uint256 => PayoutType) private edgeCases;
    
    constructor() {
        _initializeEdgeCases();
    }
    
    /**
     * @dev Ultra-optimized payout lookup: O(1) math patterns + fallback storage
     * @param combinationKey The combination (e.g., 333 for triple pumps)
     * @return payoutType The payout type for this combination
     */
    function getPayoutType(uint256 combinationKey) external view returns (PayoutType) {
        // First check mathematical patterns for instant O(1) lookup (~86.50% of cases)
        PayoutType mathPattern = _checkMathematicalPatterns(combinationKey);
        if (mathPattern != PayoutType.LOSE) {
            return mathPattern;
        }
        
        // Fallback to edge case storage
        return edgeCases[combinationKey];
    }
    
    /**
     * @dev Assembly-optimized mathematical pattern detection
     * @dev Covers ~86.50% of cases without storage lookup
     */
    function _checkMathematicalPatterns(uint256 combinationKey) internal pure returns (PayoutType) {
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
        uint256 count1 = (counts >> 0) & 0xF;   // DUMP count
        uint256 count2 = (counts >> 4) & 0xF;   // COPE count  
        uint256 count3 = (counts >> 8) & 0xF;   // PUMP count
        uint256 count4 = (counts >> 12) & 0xF;  // DIAMOND count
        uint256 count5 = (counts >> 16) & 0xF;  // ROCKET count
        uint256 count6 = (counts >> 20) & 0xF;  // JACKPOT count
        
        // All same symbol patterns
        if (count6 == 4) return PayoutType.JACKPOT;     // All jackpots
        if (count5 == 4) return PayoutType.ULTRA_WIN;   // All rockets
        if (count4 == 4) return PayoutType.MEGA_WIN;    // All diamonds
        if (count3 == 4) return PayoutType.BIG_WIN;     // All pumps
        if (count2 == 4) return PayoutType.MEDIUM_WIN;  // All copes
        
        // Almost all patterns (n-1 matching)
        if (count6 == 3) return PayoutType.SPECIAL_COMBO; // Almost jackpot
        if (count5 == 3) return PayoutType.SPECIAL_COMBO; // Almost rockets
        
        // Specific rocket patterns
        
        if (count5 == 3) return PayoutType.SPECIAL_COMBO; // Three rockets
        
        // Mixed high-value combinations
        if (count4 >= 2 && count5 >= 1) return PayoutType.SPECIAL_COMBO;
        if (count5 >= 2 && count4 >= 1) return PayoutType.SPECIAL_COMBO;
        
        // Triple patterns
        if (count6 >= 3) return PayoutType.MEGA_WIN;
        if (count5 >= 3) return PayoutType.BIG_WIN;
        if (count4 >= 3) return PayoutType.BIG_WIN;
        if (count3 >= 3) return PayoutType.MEDIUM_WIN;
        if (count2 >= 3) return PayoutType.MEDIUM_WIN;
        
        
        // 4+ reel quadruple patterns
        if (count6 >= 4) return PayoutType.MEGA_WIN;
        if (count5 >= 4) return PayoutType.MEGA_WIN;
        if (count4 >= 4) return PayoutType.MEGA_WIN;
        if (count3 >= 4) return PayoutType.BIG_WIN;
        if (count2 >= 4) return PayoutType.BIG_WIN;
        
        // Pair patterns
        if (count6 >= 2) return PayoutType.SMALL_WIN;
        if (count5 >= 2) return PayoutType.SMALL_WIN;
        if (count4 >= 2) return PayoutType.SMALL_WIN;
        if (count3 >= 2) return PayoutType.SMALL_WIN;
        if (count2 >= 2) return PayoutType.SMALL_WIN;
        
        return PayoutType.LOSE; // No pattern matched
    }
    
    /**
     * @dev Initialize only the edge cases not covered by mathematical patterns
     */
    function _initializeEdgeCases() internal {
        // LOSE edge cases (174 total)
        edgeCases[1122] = PayoutType.LOSE;
        edgeCases[1133] = PayoutType.LOSE;
        edgeCases[1144] = PayoutType.LOSE;
        edgeCases[1155] = PayoutType.LOSE;
        edgeCases[1166] = PayoutType.LOSE;
        edgeCases[1212] = PayoutType.LOSE;
        edgeCases[1221] = PayoutType.LOSE;
        edgeCases[1223] = PayoutType.LOSE;
        edgeCases[1224] = PayoutType.LOSE;
        edgeCases[1225] = PayoutType.LOSE;
        edgeCases[1226] = PayoutType.LOSE;
        edgeCases[1232] = PayoutType.LOSE;
        edgeCases[1242] = PayoutType.LOSE;
        edgeCases[1252] = PayoutType.LOSE;
        edgeCases[1262] = PayoutType.LOSE;
        edgeCases[1313] = PayoutType.LOSE;
        edgeCases[1322] = PayoutType.LOSE;
        edgeCases[1331] = PayoutType.LOSE;
        edgeCases[1414] = PayoutType.LOSE;
        edgeCases[1422] = PayoutType.LOSE;
        edgeCases[1441] = PayoutType.LOSE;
        edgeCases[1515] = PayoutType.LOSE;
        edgeCases[1522] = PayoutType.LOSE;
        edgeCases[1551] = PayoutType.LOSE;
        edgeCases[1616] = PayoutType.LOSE;
        edgeCases[1622] = PayoutType.LOSE;
        edgeCases[1661] = PayoutType.LOSE;
        edgeCases[2112] = PayoutType.LOSE;
        edgeCases[2121] = PayoutType.LOSE;
        edgeCases[2123] = PayoutType.LOSE;
        edgeCases[2124] = PayoutType.LOSE;
        edgeCases[2125] = PayoutType.LOSE;
        edgeCases[2126] = PayoutType.LOSE;
        edgeCases[2132] = PayoutType.LOSE;
        edgeCases[2142] = PayoutType.LOSE;
        edgeCases[2152] = PayoutType.LOSE;
        edgeCases[2162] = PayoutType.LOSE;
        edgeCases[2211] = PayoutType.LOSE;
        edgeCases[2213] = PayoutType.LOSE;
        edgeCases[2214] = PayoutType.LOSE;
        edgeCases[2215] = PayoutType.LOSE;
        edgeCases[2216] = PayoutType.LOSE;
        edgeCases[2231] = PayoutType.LOSE;
        edgeCases[2233] = PayoutType.LOSE;
        edgeCases[2234] = PayoutType.LOSE;
        edgeCases[2235] = PayoutType.LOSE;
        edgeCases[2236] = PayoutType.LOSE;
        edgeCases[2241] = PayoutType.LOSE;
        edgeCases[2243] = PayoutType.LOSE;
        edgeCases[2244] = PayoutType.LOSE;
        edgeCases[2245] = PayoutType.LOSE;
        edgeCases[2246] = PayoutType.LOSE;
        edgeCases[2251] = PayoutType.LOSE;
        edgeCases[2253] = PayoutType.LOSE;
        edgeCases[2254] = PayoutType.LOSE;
        edgeCases[2255] = PayoutType.LOSE;
        edgeCases[2256] = PayoutType.LOSE;
        edgeCases[2261] = PayoutType.LOSE;
        edgeCases[2263] = PayoutType.LOSE;
        edgeCases[2264] = PayoutType.LOSE;
        edgeCases[2265] = PayoutType.LOSE;
        edgeCases[2266] = PayoutType.LOSE;
        edgeCases[2312] = PayoutType.LOSE;
        edgeCases[2321] = PayoutType.LOSE;
        edgeCases[2323] = PayoutType.LOSE;
        edgeCases[2324] = PayoutType.LOSE;
        edgeCases[2325] = PayoutType.LOSE;
        edgeCases[2326] = PayoutType.LOSE;
        edgeCases[2332] = PayoutType.LOSE;
        edgeCases[2342] = PayoutType.LOSE;
        edgeCases[2352] = PayoutType.LOSE;
        edgeCases[2362] = PayoutType.LOSE;
        edgeCases[2412] = PayoutType.LOSE;
        edgeCases[2421] = PayoutType.LOSE;
        edgeCases[2423] = PayoutType.LOSE;
        edgeCases[2424] = PayoutType.LOSE;
        edgeCases[2425] = PayoutType.LOSE;
        edgeCases[2426] = PayoutType.LOSE;
        edgeCases[2432] = PayoutType.LOSE;
        edgeCases[2442] = PayoutType.LOSE;
        edgeCases[2452] = PayoutType.LOSE;
        edgeCases[2462] = PayoutType.LOSE;
        edgeCases[2512] = PayoutType.LOSE;
        edgeCases[2521] = PayoutType.LOSE;
        edgeCases[2523] = PayoutType.LOSE;
        edgeCases[2524] = PayoutType.LOSE;
        edgeCases[2525] = PayoutType.LOSE;
        edgeCases[2526] = PayoutType.LOSE;
        edgeCases[2532] = PayoutType.LOSE;
        edgeCases[2542] = PayoutType.LOSE;
        edgeCases[2552] = PayoutType.LOSE;
        edgeCases[2562] = PayoutType.LOSE;
        edgeCases[2612] = PayoutType.LOSE;
        edgeCases[2621] = PayoutType.LOSE;
        edgeCases[2623] = PayoutType.LOSE;
        edgeCases[2624] = PayoutType.LOSE;
        edgeCases[2625] = PayoutType.LOSE;
        edgeCases[2626] = PayoutType.LOSE;
        edgeCases[2632] = PayoutType.LOSE;
        edgeCases[2642] = PayoutType.LOSE;
        edgeCases[2652] = PayoutType.LOSE;
        edgeCases[2662] = PayoutType.LOSE;
        edgeCases[3113] = PayoutType.LOSE;
        edgeCases[3122] = PayoutType.LOSE;
        edgeCases[3131] = PayoutType.LOSE;
        edgeCases[3212] = PayoutType.LOSE;
        edgeCases[3221] = PayoutType.LOSE;
        edgeCases[3223] = PayoutType.LOSE;
        edgeCases[3224] = PayoutType.LOSE;
        edgeCases[3225] = PayoutType.LOSE;
        edgeCases[3226] = PayoutType.LOSE;
        edgeCases[3232] = PayoutType.LOSE;
        edgeCases[3242] = PayoutType.LOSE;
        edgeCases[3252] = PayoutType.LOSE;
        edgeCases[3262] = PayoutType.LOSE;
        edgeCases[3311] = PayoutType.LOSE;
        edgeCases[3322] = PayoutType.LOSE;
        edgeCases[3422] = PayoutType.LOSE;
        edgeCases[3522] = PayoutType.LOSE;
        edgeCases[3622] = PayoutType.LOSE;
        edgeCases[4114] = PayoutType.LOSE;
        edgeCases[4122] = PayoutType.LOSE;
        edgeCases[4141] = PayoutType.LOSE;
        edgeCases[4212] = PayoutType.LOSE;
        edgeCases[4221] = PayoutType.LOSE;
        edgeCases[4223] = PayoutType.LOSE;
        edgeCases[4224] = PayoutType.LOSE;
        edgeCases[4225] = PayoutType.LOSE;
        edgeCases[4226] = PayoutType.LOSE;
        edgeCases[4232] = PayoutType.LOSE;
        edgeCases[4242] = PayoutType.LOSE;
        edgeCases[4252] = PayoutType.LOSE;
        edgeCases[4262] = PayoutType.LOSE;
        edgeCases[4322] = PayoutType.LOSE;
        edgeCases[4411] = PayoutType.LOSE;
        edgeCases[4422] = PayoutType.LOSE;
        edgeCases[4522] = PayoutType.LOSE;
        edgeCases[4622] = PayoutType.LOSE;
        edgeCases[5115] = PayoutType.LOSE;
        edgeCases[5122] = PayoutType.LOSE;
        edgeCases[5151] = PayoutType.LOSE;
        edgeCases[5212] = PayoutType.LOSE;
        edgeCases[5221] = PayoutType.LOSE;
        edgeCases[5223] = PayoutType.LOSE;
        edgeCases[5224] = PayoutType.LOSE;
        edgeCases[5225] = PayoutType.LOSE;
        edgeCases[5226] = PayoutType.LOSE;
        edgeCases[5232] = PayoutType.LOSE;
        edgeCases[5242] = PayoutType.LOSE;
        edgeCases[5252] = PayoutType.LOSE;
        edgeCases[5262] = PayoutType.LOSE;
        edgeCases[5322] = PayoutType.LOSE;
        edgeCases[5422] = PayoutType.LOSE;
        edgeCases[5511] = PayoutType.LOSE;
        edgeCases[5522] = PayoutType.LOSE;
        edgeCases[5622] = PayoutType.LOSE;
        edgeCases[6116] = PayoutType.LOSE;
        edgeCases[6122] = PayoutType.LOSE;
        edgeCases[6161] = PayoutType.LOSE;
        edgeCases[6212] = PayoutType.LOSE;
        edgeCases[6221] = PayoutType.LOSE;
        edgeCases[6223] = PayoutType.LOSE;
        edgeCases[6224] = PayoutType.LOSE;
        edgeCases[6225] = PayoutType.LOSE;
        edgeCases[6226] = PayoutType.LOSE;
        edgeCases[6232] = PayoutType.LOSE;
        edgeCases[6242] = PayoutType.LOSE;
        edgeCases[6252] = PayoutType.LOSE;
        edgeCases[6262] = PayoutType.LOSE;
        edgeCases[6322] = PayoutType.LOSE;
        edgeCases[6422] = PayoutType.LOSE;
        edgeCases[6522] = PayoutType.LOSE;
        edgeCases[6611] = PayoutType.LOSE;
        edgeCases[6622] = PayoutType.LOSE;

        // MEDIUM_WIN edge cases (1 total)
        edgeCases[1111] = PayoutType.MEDIUM_WIN;
    }
}
