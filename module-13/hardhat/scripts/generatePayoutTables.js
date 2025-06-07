const fs = require('fs');

// Symbol enum mapping
const Symbol = {
    DUMP: 1,    // 📉 40% - mostly loses
    COPE: 2,    // 🤡 25% - small wins  
    PUMP: 3,    // 📈 20% - medium wins
    DIAMOND: 4, // 💎 10% - big wins
    ROCKET: 5,  // 🚀 4.5% - ultra wins
    JACKPOT: 6  // 🐵 0.5% - jackpot
};

// PayoutType enum mapping
const PayoutType = {
    LOSE: 0,
    SMALL_WIN: 1,      // 2x
    MEDIUM_WIN: 2,     // 5x
    BIG_WIN: 3,        // 10x
    MEGA_WIN: 4,       // 50x
    ULTRA_WIN: 5,      // 100x
    SPECIAL_COMBO: 6,  // 20x
    JACKPOT: 7         // 50% of pool
};

/**
 * Calculate payout type for a given combination
 */
function calculatePayoutType(reels) {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Index 0 unused, 1-6 for symbols
    
    // Count each symbol
    for (const reel of reels) {
        counts[reel]++;
    }
    
    const reelCount = reels.length;
    
    // JACKPOT: All jackpot symbols
    if (counts[Symbol.JACKPOT] === reelCount) {
        return PayoutType.JACKPOT;
    }
    
    // ULTRA_WIN: All rockets
    if (counts[Symbol.ROCKET] === reelCount) {
        return PayoutType.ULTRA_WIN;
    }
    
    // MEGA_WIN: All diamonds
    if (counts[Symbol.DIAMOND] === reelCount) {
        return PayoutType.MEGA_WIN;
    }
    
    // BIG_WIN: All pumps
    if (counts[Symbol.PUMP] === reelCount) {
        return PayoutType.BIG_WIN;
    }
    
    // MEDIUM_WIN: All copes
    if (counts[Symbol.COPE] === reelCount) {
        return PayoutType.MEDIUM_WIN;
    }
    
    // SPECIAL_COMBO: Specific patterns based on reel count
    if (isSpecialCombo(reels, counts)) {
        return PayoutType.SPECIAL_COMBO;
    }
    
    // Check for winning patterns based on symbol matches
    const maxCount = Math.max(...counts);
    const symbolWithMaxCount = counts.indexOf(maxCount);
    
    // For 3+ reels: Need at least 3 matching for big wins
    if (reelCount >= 3) {
        if (maxCount >= 3) {
            if (symbolWithMaxCount === Symbol.JACKPOT) return PayoutType.MEGA_WIN;
            if (symbolWithMaxCount === Symbol.ROCKET) return PayoutType.BIG_WIN;
            if (symbolWithMaxCount === Symbol.DIAMOND) return PayoutType.BIG_WIN;
            if (symbolWithMaxCount === Symbol.PUMP) return PayoutType.MEDIUM_WIN;
            if (symbolWithMaxCount === Symbol.COPE) return PayoutType.MEDIUM_WIN;
        }
    }
    
    // For 4+ reels: More complex patterns
    if (reelCount >= 4) {
        // 4+ matching high-value symbols
        if (maxCount >= 4) {
            if (symbolWithMaxCount >= Symbol.DIAMOND) return PayoutType.MEGA_WIN;
            if (symbolWithMaxCount >= Symbol.PUMP) return PayoutType.BIG_WIN;
            return PayoutType.MEDIUM_WIN;
        }
    }
    
    // Check for pairs (2 matching of valuable symbols)
    if (maxCount >= 2) {
        if (symbolWithMaxCount >= Symbol.DIAMOND) return PayoutType.SMALL_WIN;
        if (symbolWithMaxCount >= Symbol.PUMP && reelCount <= 4) return PayoutType.SMALL_WIN;
    }
    
    return PayoutType.LOSE;
}

/**
 * Check for special combination patterns
 */
function isSpecialCombo(reels, counts) {
    const reelCount = reels.length;
    
    // Special: Almost jackpot (all but one are jackpots)
    if (counts[Symbol.JACKPOT] === reelCount - 1) {
        return true;
    }
    
    // Special: Almost rockets (all but one are rockets) 
    if (counts[Symbol.ROCKET] === reelCount - 1) {
        return true;
    }
    
    // Special: Exactly 2 rockets (for 3-reel compatibility)
    if (reelCount === 3 && counts[Symbol.ROCKET] === 2) {
        return true;
    }
    
    // Special: Exactly 3 rockets (for 4+ reels)
    if (reelCount >= 4 && counts[Symbol.ROCKET] === 3) {
        return true;
    }
    
    // Special: Mixed high-value symbols (diamond + rocket combinations)
    if (counts[Symbol.DIAMOND] >= 2 && counts[Symbol.ROCKET] >= 1) {
        return true;
    }
    
    if (counts[Symbol.ROCKET] >= 2 && counts[Symbol.DIAMOND] >= 1) {
        return true;
    }
    
    return false;
}

/**
 * Check if combination matches mathematical pattern (for optimization)
 */
function checkMathematicalPattern(reels) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const reel of reels) counts[reel]++;
    
    const reelCount = reels.length;
    
    // All same symbol patterns
    if (counts[6] === reelCount) return PayoutType.JACKPOT;
    if (counts[5] === reelCount) return PayoutType.ULTRA_WIN;
    if (counts[4] === reelCount) return PayoutType.MEGA_WIN;
    if (counts[3] === reelCount) return PayoutType.BIG_WIN;
    if (counts[2] === reelCount) return PayoutType.MEDIUM_WIN;
    
    // Almost all patterns (n-1 matching)
    if (counts[6] === reelCount - 1) return PayoutType.SPECIAL_COMBO;
    if (counts[5] === reelCount - 1) return PayoutType.SPECIAL_COMBO;
    
    // Specific rocket patterns
    if (reelCount === 3 && counts[5] === 2) return PayoutType.SPECIAL_COMBO;
    if (reelCount >= 4 && counts[5] === 3) return PayoutType.SPECIAL_COMBO;
    
    // Mixed high-value combinations
    if (counts[4] >= 2 && counts[5] >= 1) return PayoutType.SPECIAL_COMBO;
    if (counts[5] >= 2 && counts[4] >= 1) return PayoutType.SPECIAL_COMBO;
    
    // Triple patterns for all symbols
    if (counts[6] >= 3) return PayoutType.MEGA_WIN;
    if (counts[5] >= 3) return PayoutType.BIG_WIN;
    if (counts[4] >= 3) return PayoutType.BIG_WIN;
    if (counts[3] >= 3) return PayoutType.MEDIUM_WIN;
    if (counts[2] >= 3) return PayoutType.MEDIUM_WIN;
    
    // 4+ reel quadruple patterns
    if (reelCount >= 4) {
        if (counts[6] >= 4) return PayoutType.MEGA_WIN;
        if (counts[5] >= 4) return PayoutType.MEGA_WIN;
        if (counts[4] >= 4) return PayoutType.MEGA_WIN;
        if (counts[3] >= 4) return PayoutType.BIG_WIN;
        if (counts[2] >= 4) return PayoutType.BIG_WIN;
    }
    
    // Pair patterns
    if (counts[6] >= 2) return PayoutType.SMALL_WIN;
    if (counts[5] >= 2) return PayoutType.SMALL_WIN;
    if (counts[4] >= 2) return PayoutType.SMALL_WIN;
    if (counts[3] >= 2 && reelCount <= 5) return PayoutType.SMALL_WIN;
    if (counts[2] >= 2 && reelCount <= 4) return PayoutType.SMALL_WIN;
    
    return PayoutType.LOSE;
}

/**
 * Generate edge cases that need explicit storage (not covered by math patterns)
 */
function generateEdgeCases(reelCount) {
    const edgeCases = [];
    
    function generateRecursive(currentReels, depth) {
        if (depth === reelCount) {
            const key = parseInt(currentReels.join(''));
            const actualPayout = calculatePayoutType(currentReels);
            const mathPayout = checkMathematicalPattern(currentReels);
            
            // Only store if mathematical pattern doesn't cover it
            if (actualPayout !== mathPayout) {
                edgeCases.push({ key, payout: actualPayout });
            }
            return;
        }
        
        for (let symbol = 1; symbol <= 6; symbol++) {
            currentReels[depth] = symbol;
            generateRecursive(currentReels, depth + 1);
        }
    }
    
    generateRecursive(new Array(reelCount), 0);
    return edgeCases;
}

/**
 * Generate optimized contract for specific reel count
 */
function generateOptimizedContract(reelCount) {
    const edgeCases = generateEdgeCases(reelCount);
    const totalPossible = Math.pow(6, reelCount);
    const reductionRatio = ((1 - edgeCases.length / totalPossible) * 100).toFixed(2);
    
    console.log(`${reelCount}-reel: ${edgeCases.length}/${totalPossible} edge cases (${reductionRatio}% reduction)`);
    
    // For PayoutTables7, use chunked approach
    if (reelCount === 7) {
        return generateChunkedContract7(edgeCases, totalPossible, reductionRatio);
    }
    
    // Use bit-packing for contracts with many edge cases (6 reels)
    const useBitPacking = edgeCases.length > 5000;
    
    if (useBitPacking) {
        return generateBitPackedContract(reelCount, edgeCases, totalPossible, reductionRatio);
    } else {
        return generateStandardContract(reelCount, edgeCases, totalPossible, reductionRatio);
    }
}

/**
 * Generate standard contract for smaller reel counts
 */
function generateStandardContract(reelCount, edgeCases, totalPossible, reductionRatio) {
    // Filter out LOSE cases - mappings default to 0, no need to set explicitly
    const nonLoseEdgeCases = edgeCases.filter(edge => edge.payout !== PayoutType.LOSE);
    
    // Group edge cases by payout type for efficient storage
    const byPayoutType = {};
    for (const edge of nonLoseEdgeCases) {
        if (!byPayoutType[edge.payout]) byPayoutType[edge.payout] = [];
        byPayoutType[edge.payout].push(edge.key);
    }
    
    const actualStoredCases = nonLoseEdgeCases.length;
    const originalStoredCases = edgeCases.length;
    const loseCasesRemoved = originalStoredCases - actualStoredCases;
    
    let solidityCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title PayoutTables${reelCount} - Ultra-optimized ${reelCount}-reel payout lookup
 * @dev Uses mathematical patterns + assembly for ${reductionRatio}% storage reduction
 * @notice Only stores ${actualStoredCases} winning edge cases vs ${totalPossible} total combinations
 * @notice Removed ${loseCasesRemoved} LOSE cases (mappings default to 0)
 */
contract PayoutTables${reelCount} {
    
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
    
    // Only store winning edge cases - LOSE cases default to 0
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
        // First check mathematical patterns for instant O(1) lookup (~${reductionRatio}% of cases)
        PayoutType mathPattern = _checkMathematicalPatterns(combinationKey);
        if (mathPattern != PayoutType.LOSE) {
            return mathPattern;
        }
        
        // Fallback to edge case storage (defaults to LOSE if not found)
        return edgeCases[combinationKey];
    }
    
    /**
     * @dev Assembly-optimized mathematical pattern detection
     * @dev Covers ~${reductionRatio}% of cases without storage lookup
     */
    function _checkMathematicalPatterns(uint256 combinationKey) internal pure returns (PayoutType) {
        // Extract individual reels using assembly for gas efficiency
        uint256[${reelCount}] memory reels;
        uint256 temp = combinationKey;
        
        assembly {
            // Extract reels from right to left
            for { let i := 0 } lt(i, ${reelCount}) { i := add(i, 1) } {
                mstore(add(reels, mul(i, 32)), mod(temp, 10))
                temp := div(temp, 10)
            }
        }
        
        // Count symbols using assembly-optimized bit packing
        uint256 counts; // Pack all counts into single uint256 (6 symbols × 4 bits each)
        
        assembly {
            for { let i := 0 } lt(i, ${reelCount}) { i := add(i, 1) } {
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
        if (count6 == ${reelCount}) return PayoutType.JACKPOT;     // All jackpots
        if (count5 == ${reelCount}) return PayoutType.ULTRA_WIN;   // All rockets
        if (count4 == ${reelCount}) return PayoutType.MEGA_WIN;    // All diamonds
        if (count3 == ${reelCount}) return PayoutType.BIG_WIN;     // All pumps
        if (count2 == ${reelCount}) return PayoutType.MEDIUM_WIN;  // All copes
        
        // Almost all patterns (n-1 matching)
        if (count6 == ${reelCount - 1}) return PayoutType.SPECIAL_COMBO; // Almost jackpot
        if (count5 == ${reelCount - 1}) return PayoutType.SPECIAL_COMBO; // Almost rockets
        
        // Specific rocket patterns
        ${reelCount === 3 ? 'if (count5 == 2) return PayoutType.SPECIAL_COMBO; // Two rockets' : ''}
        ${reelCount >= 4 ? 'if (count5 == 3) return PayoutType.SPECIAL_COMBO; // Three rockets' : ''}
        
        // Mixed high-value combinations
        if (count4 >= 2 && count5 >= 1) return PayoutType.SPECIAL_COMBO;
        if (count5 >= 2 && count4 >= 1) return PayoutType.SPECIAL_COMBO;
        
        // Triple patterns
        if (count6 >= 3) return PayoutType.MEGA_WIN;
        if (count5 >= 3) return PayoutType.BIG_WIN;
        if (count4 >= 3) return PayoutType.BIG_WIN;
        if (count3 >= 3) return PayoutType.MEDIUM_WIN;
        if (count2 >= 3) return PayoutType.MEDIUM_WIN;
        
        ${reelCount >= 4 ? `
        // 4+ reel quadruple patterns
        if (count6 >= 4) return PayoutType.MEGA_WIN;
        if (count5 >= 4) return PayoutType.MEGA_WIN;
        if (count4 >= 4) return PayoutType.MEGA_WIN;
        if (count3 >= 4) return PayoutType.BIG_WIN;
        if (count2 >= 4) return PayoutType.BIG_WIN;` : ''}
        
        // Pair patterns
        if (count6 >= 2) return PayoutType.SMALL_WIN;
        if (count5 >= 2) return PayoutType.SMALL_WIN;
        if (count4 >= 2) return PayoutType.SMALL_WIN;
        ${reelCount <= 5 ? 'if (count3 >= 2) return PayoutType.SMALL_WIN;' : ''}
        ${reelCount <= 4 ? 'if (count2 >= 2) return PayoutType.SMALL_WIN;' : ''}
        
        return PayoutType.LOSE; // No pattern matched
    }
    
    /**
     * @dev Initialize only winning edge cases - LOSE cases omitted (default to 0)
     */
    function _initializeEdgeCases() internal {`;

    // Generate edge case assignments (only for non-LOSE cases)
    const payoutTypeNames = ['LOSE', 'SMALL_WIN', 'MEDIUM_WIN', 'BIG_WIN', 'MEGA_WIN', 'ULTRA_WIN', 'SPECIAL_COMBO', 'JACKPOT'];
    
    for (const [payoutType, keys] of Object.entries(byPayoutType)) {
        const typeName = payoutTypeNames[payoutType];
        if (keys.length > 0) {
            solidityCode += `\n        // ${typeName} edge cases (${keys.length} total)\n`;
            for (const key of keys) {
                solidityCode += `        edgeCases[${key}] = PayoutType.${typeName};\n`;
            }
        }
    }
    
    solidityCode += `    }
}
`;

    return solidityCode;
}

/**
 * Generate bit-packed contract for larger reel counts (6+ reels)
 */
function generateBitPackedContract(reelCount, edgeCases, totalPossible, reductionRatio) {
    // Filter out LOSE cases - mappings default to 0, no need to store
    const nonLoseEdgeCases = edgeCases.filter(edge => edge.payout !== PayoutType.LOSE);
    
    // Pack 10 payout types per storage slot (3 bits each = 30 bits used)
    const packedSlots = {};
    
    for (const edge of nonLoseEdgeCases) {
        const slotIndex = Math.floor(edge.key / 10);
        const positionInSlot = edge.key % 10;
        
        if (!packedSlots[slotIndex]) {
            packedSlots[slotIndex] = new Array(10).fill(0);
        }
        packedSlots[slotIndex][positionInSlot] = edge.payout;
    }
    
    const actualStoredCases = nonLoseEdgeCases.length;
    const originalStoredCases = edgeCases.length;
    const loseCasesRemoved = originalStoredCases - actualStoredCases;
    
    let solidityCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title PayoutTables${reelCount} - Bit-packed ${reelCount}-reel payout lookup
 * @dev Uses math patterns + bit-packing for ${reductionRatio}% reduction
 * @notice Stores ${actualStoredCases} winning edge cases in ${Object.keys(packedSlots).length} packed slots vs ${totalPossible} total
 * @notice Removed ${loseCasesRemoved} LOSE cases (default to 0)
 */
contract PayoutTables${reelCount} {
    
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
    
    // Bit-packed storage: 10 payout types per uint256 (3 bits each)
    mapping(uint256 => uint256) private packedPayouts;
    
    constructor() {
        _initializePackedPayouts();
    }
    
    /**
     * @dev Ultra-optimized payout lookup with bit-packing
     */
    function getPayoutType(uint256 combinationKey) external view returns (PayoutType) {
        // First check mathematical patterns
        PayoutType mathPattern = _checkMathematicalPatterns(combinationKey);
        if (mathPattern != PayoutType.LOSE) {
            return mathPattern;
        }
        
        // Fallback to bit-packed storage (defaults to LOSE if not found)
        return _getPackedPayoutType(combinationKey);
    }
    
    /**
     * @dev Get payout from bit-packed storage
     */
    function _getPackedPayoutType(uint256 combinationKey) internal view returns (PayoutType) {
        uint256 slotIndex = combinationKey / 10;
        uint256 positionInSlot = combinationKey % 10;
        
        uint256 packedData = packedPayouts[slotIndex];
        
        assembly {
            // Extract 3-bit payout type from packed data
            let shift := mul(positionInSlot, 3)
            packedData := and(shr(shift, packedData), 0x7) // 0x7 = 111 in binary
        }
        
        return PayoutType(packedData);
    }
    
    /**
     * @dev Mathematical pattern detection (same as standard version)
     */
    function _checkMathematicalPatterns(uint256 combinationKey) internal pure returns (PayoutType) {
        // Extract individual reels using assembly for gas efficiency
        uint256[${reelCount}] memory reels;
        uint256 temp = combinationKey;
        
        assembly {
            // Extract reels from right to left
            for { let i := 0 } lt(i, ${reelCount}) { i := add(i, 1) } {
                mstore(add(reels, mul(i, 32)), mod(temp, 10))
                temp := div(temp, 10)
            }
        }
        
        // Count symbols using assembly-optimized bit packing
        uint256 counts; // Pack all counts into single uint256 (6 symbols × 4 bits each)
        
        assembly {
            for { let i := 0 } lt(i, ${reelCount}) { i := add(i, 1) } {
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
        if (count6 == ${reelCount}) return PayoutType.JACKPOT;
        if (count5 == ${reelCount}) return PayoutType.ULTRA_WIN;
        if (count4 == ${reelCount}) return PayoutType.MEGA_WIN;
        if (count3 == ${reelCount}) return PayoutType.BIG_WIN;
        if (count2 == ${reelCount}) return PayoutType.MEDIUM_WIN;
        
        // Almost all patterns
        if (count6 == ${reelCount - 1}) return PayoutType.SPECIAL_COMBO;
        if (count5 == ${reelCount - 1}) return PayoutType.SPECIAL_COMBO;
        
        // Specific rocket patterns
        ${reelCount >= 4 ? 'if (count5 == 3) return PayoutType.SPECIAL_COMBO;' : ''}
        
        // Mixed high-value combinations
        if (count4 >= 2 && count5 >= 1) return PayoutType.SPECIAL_COMBO;
        if (count5 >= 2 && count4 >= 1) return PayoutType.SPECIAL_COMBO;
        
        // Triple+ patterns
        if (count6 >= 3) return PayoutType.MEGA_WIN;
        if (count5 >= 3) return PayoutType.BIG_WIN;
        if (count4 >= 3) return PayoutType.BIG_WIN;
        if (count3 >= 3) return PayoutType.MEDIUM_WIN;
        if (count2 >= 3) return PayoutType.MEDIUM_WIN;
        
        // 4+ patterns
        if (count6 >= 4) return PayoutType.MEGA_WIN;
        if (count5 >= 4) return PayoutType.MEGA_WIN;
        if (count4 >= 4) return PayoutType.MEGA_WIN;
        if (count3 >= 4) return PayoutType.BIG_WIN;
        if (count2 >= 4) return PayoutType.BIG_WIN;
        
        // Pair patterns
        if (count6 >= 2) return PayoutType.SMALL_WIN;
        if (count5 >= 2) return PayoutType.SMALL_WIN;
        if (count4 >= 2) return PayoutType.SMALL_WIN;
        
        return PayoutType.LOSE;
    }
    
    /**
     * @dev Initialize bit-packed payouts (only winning cases)
     */
    function _initializePackedPayouts() internal {`;

    // Generate bit-packed initialization (only for slots that have non-zero values)
    for (const [slotIndex, slot] of Object.entries(packedSlots)) {
        // Calculate packed value
        let packedValue = 0n;
        let hasNonZero = false;
        
        for (let i = 0; i < 10; i++) {
            const payoutType = slot[i] || 0;
            if (payoutType > 0) hasNonZero = true;
            packedValue |= BigInt(payoutType) << (BigInt(i) * 3n);
        }
        
        // Only store if there are non-zero values in this slot
        if (hasNonZero) {
            solidityCode += `\n        packedPayouts[${slotIndex}] = ${packedValue.toString()};`;
        }
    }
    
    solidityCode += `\n    }
}
`;
    
    return solidityCode;
}

/**
 * Generate unified interface contract that routes to specialized contracts
 */
function generateUnifiedInterface() {
    return `// SPDX-License-Identifier: MIT
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
`;
}

/**
 * Generate all optimized contracts
 */
function generateAllContracts() {
    console.log('🎰 Generating ultra-optimized payout contracts...\n');
    
    let totalEdgeCases = 0;
    let totalPossible = 0;
    let totalLoseCasesRemoved = 0;
    const contractSizes = [];
    
    for (let reelCount = 3; reelCount <= 7; reelCount++) {
        const edgeCases = generateEdgeCases(reelCount);
        const nonLoseEdgeCases = edgeCases.filter(edge => edge.payout !== PayoutType.LOSE);
        const loseCasesRemoved = edgeCases.length - nonLoseEdgeCases.length;
        
        const contracts = generateOptimizedContract(reelCount);
        const possible = Math.pow(6, reelCount);
        
        totalEdgeCases += nonLoseEdgeCases.length;
        totalPossible += possible;
        totalLoseCasesRemoved += loseCasesRemoved;
        
        // Handle chunked contracts (array) vs single contract (string)
        if (Array.isArray(contracts)) {
            // PayoutTables7 chunked contracts
            console.log(`✅ Generated PayoutTables${reelCount} with ${contracts.length - 1} chunk contracts + 1 router`);
            console.log(`   Stored: ${nonLoseEdgeCases.length}/${edgeCases.length} edge cases (removed ${loseCasesRemoved} LOSE cases)`);
            
            let totalSizeKB = 0;
            for (const contract of contracts) {
                fs.writeFileSync(`./contracts/${contract.filename}`, contract.content);
                const sizeKB = (contract.content.length / 1024).toFixed(1);
                totalSizeKB += parseFloat(sizeKB);
                
                if (contract.isRouter) {
                    console.log(`   📁 ${contract.filename} (${sizeKB}KB) [ROUTER]`);
                } else {
                    console.log(`   📁 ${contract.filename} (${sizeKB}KB) [CHUNK ${contract.partNumber}] Keys: ${contract.minKey}-${contract.maxKey}`);
                }
            }
            
            contractSizes.push({ 
                reelCount, 
                sizeKB: totalSizeKB.toFixed(1), 
                useBitPacking: false,
                isChunked: true,
                chunkCount: contracts.length - 1,
                originalEdges: edgeCases.length,
                storedEdges: nonLoseEdgeCases.length,
                loseCasesRemoved
            });
        } else {
            // Regular single contract
            const sizeKB = (contracts.length / 1024).toFixed(1);
            contractSizes.push({ 
                reelCount, 
                sizeKB, 
                useBitPacking: edgeCases.length > 5000,
                isChunked: false,
                originalEdges: edgeCases.length,
                storedEdges: nonLoseEdgeCases.length,
                loseCasesRemoved
            });
            
            fs.writeFileSync(`./contracts/PayoutTables${reelCount}.sol`, contracts);
            console.log(`✅ Generated PayoutTables${reelCount}.sol (${sizeKB}KB) ${edgeCases.length > 5000 ? '[BIT-PACKED]' : '[STANDARD]'}`);
            console.log(`   Stored: ${nonLoseEdgeCases.length}/${edgeCases.length} edge cases (removed ${loseCasesRemoved} LOSE cases)`);
        }
    }
    
    // Generate unified interface contract
    const unifiedContract = generateUnifiedInterface();
    fs.writeFileSync(`./contracts/PayoutTables.sol`, unifiedContract);
    const unifiedSizeKB = (unifiedContract.length / 1024).toFixed(1);
    console.log(`✅ Generated PayoutTables.sol (${unifiedSizeKB}KB) [UNIFIED INTERFACE]`);
    
    const overallReduction = ((1 - totalEdgeCases / totalPossible) * 100).toFixed(2);
    const loseOptimization = ((totalLoseCasesRemoved / (totalEdgeCases + totalLoseCasesRemoved)) * 100).toFixed(1);
    const maxSize = Math.max(...contractSizes.map(c => parseFloat(c.sizeKB)));
    const minSize = Math.min(...contractSizes.map(c => parseFloat(c.sizeKB)));
    
    console.log(`\n📊 OPTIMIZATION SUMMARY:`);
    console.log(`Total combinations: ${totalPossible.toLocaleString()}`);
    console.log(`Original edge cases: ${(totalEdgeCases + totalLoseCasesRemoved).toLocaleString()}`);
    console.log(`Stored edge cases: ${totalEdgeCases.toLocaleString()}`);
    console.log(`LOSE cases removed: ${totalLoseCasesRemoved.toLocaleString()} (${loseOptimization}% size reduction)`);
    console.log(`Overall reduction: ${overallReduction}%`);
    console.log(`\n🚀 Contract optimizations used:`);
    console.log(`• Mathematical patterns for O(1) lookup (~${overallReduction}% of cases)`);
    console.log(`• Assembly for ultra-fast bit manipulation`);
    console.log(`• Removed all LOSE case assignments (${loseOptimization}% size reduction)`);
    console.log(`• Standard storage for smaller contracts (3-5 reels)`);
    console.log(`• Bit-packing for larger contracts (6 reels)`);
    console.log(`• Chunked architecture for massive contracts (7 reels)`);
    console.log(`• Unified interface for clean API`);
    console.log(`• Separate deployment = modular + upgradeable architecture`);
    console.log(`\n📏 Contract sizes: ${minSize}KB - ${maxSize}KB + ${unifiedSizeKB}KB interface`);
    
    const bitPackedCount = contractSizes.filter(c => c.useBitPacking).length;
    const chunkedCount = contractSizes.filter(c => c.isChunked).length;
    const standardCount = contractSizes.length - bitPackedCount - chunkedCount;
    
    console.log(`${standardCount} standard, ${bitPackedCount} bit-packed, ${chunkedCount} chunked contracts + 1 unified interface`);
    
    // Show per-contract savings
    console.log(`\n💾 Per-contract LOSE case removal savings:`);
    for (const contract of contractSizes) {
        const savingsPercent = ((contract.loseCasesRemoved / contract.originalEdges) * 100).toFixed(1);
        const typeLabel = contract.isChunked ? `[CHUNKED: ${contract.chunkCount} parts]` : 
                         contract.useBitPacking ? '[BIT-PACKED]' : '[STANDARD]';
        console.log(`   PayoutTables${contract.reelCount}: Removed ${contract.loseCasesRemoved}/${contract.originalEdges} cases (${savingsPercent}% savings) ${typeLabel}`);
    }
    
    console.log(`\n🎯 Usage: DegenSlots → PayoutTables.sol → PayoutTables[3-7].sol`);
    console.log(`\n🎉 Optimization complete! ALL tables deployed with chunked architecture for PayoutTables7!`);
}

/**
 * Generate chunked contracts for PayoutTables7 (split into smaller deployable pieces)
 */
function generateChunkedContract7(edgeCases, totalPossible, reductionRatio) {
    const reelCount = 7;
    const nonLoseEdgeCases = edgeCases.filter(edge => edge.payout !== PayoutType.LOSE);
    
    // Split into chunks of ~1000 cases each for manageable deployment
    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < nonLoseEdgeCases.length; i += chunkSize) {
        chunks.push(nonLoseEdgeCases.slice(i, i + chunkSize));
    }
    
    console.log(`Splitting PayoutTables7 into ${chunks.length} chunks of ~${chunkSize} cases each`);
    
    const contracts = [];
    
    // Generate chunk contracts
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const partNumber = chunkIndex + 1;
        
        // Determine key range for this chunk
        const minKey = Math.min(...chunk.map(c => c.key));
        const maxKey = Math.max(...chunk.map(c => c.key));
        
        let chunkContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title PayoutTables7_Part${partNumber} - Chunked 7-reel payout lookup (Part ${partNumber}/${chunks.length})
 * @dev Handles combination keys ${minKey} to ${maxKey} (${chunk.length} cases)
 */
contract PayoutTables7_Part${partNumber} {
    
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
    
    // Key range for this chunk
    uint256 public constant MIN_KEY = ${minKey};
    uint256 public constant MAX_KEY = ${maxKey};
    
    // Only store winning edge cases for this range
    mapping(uint256 => PayoutType) private edgeCases;
    
    constructor() {
        _initializeEdgeCases();
    }
    
    /**
     * @dev Check if this contract handles the given key
     */
    function handlesKey(uint256 combinationKey) external pure returns (bool) {
        return combinationKey >= MIN_KEY && combinationKey <= MAX_KEY;
    }
    
    /**
     * @dev Get payout type for keys in this chunk's range
     */
    function getPayoutType(uint256 combinationKey) external view returns (PayoutType) {
        require(combinationKey >= MIN_KEY && combinationKey <= MAX_KEY, "Key out of range");
        return edgeCases[combinationKey]; // Defaults to LOSE if not found
    }
    
    /**
     * @dev Initialize edge cases for this chunk
     */
    function _initializeEdgeCases() internal {`;

        // Group by payout type
        const byPayoutType = {};
        for (const edge of chunk) {
            if (!byPayoutType[edge.payout]) byPayoutType[edge.payout] = [];
            byPayoutType[edge.payout].push(edge.key);
        }
        
        // Generate assignments
        const payoutTypeNames = ['LOSE', 'SMALL_WIN', 'MEDIUM_WIN', 'BIG_WIN', 'MEGA_WIN', 'ULTRA_WIN', 'SPECIAL_COMBO', 'JACKPOT'];
        
        for (const [payoutType, keys] of Object.entries(byPayoutType)) {
            const typeName = payoutTypeNames[payoutType];
            if (keys.length > 0) {
                chunkContract += `\n        // ${typeName} cases (${keys.length} total)\n`;
                for (const key of keys) {
                    chunkContract += `        edgeCases[${key}] = PayoutType.${typeName};\n`;
                }
            }
        }
        
        chunkContract += `    }
}
`;
        
        contracts.push({
            filename: `PayoutTables7_Part${partNumber}.sol`,
            content: chunkContract,
            partNumber,
            minKey,
            maxKey,
            caseCount: chunk.length
        });
    }
    
    // Generate router contract
    const routerContract = generatePayoutTables7Router(chunks.length, contracts);
    contracts.push({
        filename: 'PayoutTables7.sol',
        content: routerContract,
        isRouter: true
    });
    
    return contracts;
}

/**
 * Generate PayoutTables7 router that delegates to chunk contracts
 */
function generatePayoutTables7Router(chunkCount, chunkContracts) {
    const reelCount = 7;
    
    let routerContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title PayoutTables7 - Router for chunked 7-reel payout lookup
 * @dev Routes to ${chunkCount} chunk contracts for complete 7-reel coverage
 */

interface IPayoutTables7Chunk {
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
    
    function handlesKey(uint256 combinationKey) external pure returns (bool);
    function getPayoutType(uint256 combinationKey) external view returns (PayoutType);
}

contract PayoutTables7 {
    
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
    
    // Chunk contracts
    IPayoutTables7Chunk[${chunkCount}] public chunks;
    
    // Owner for upgradeability
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(`;
    
    // Constructor parameters for all chunk addresses
    for (let i = 0; i < chunkCount; i++) {
        routerContract += `address chunk${i + 1}`;
        if (i < chunkCount - 1) routerContract += ', ';
    }
    
    routerContract += `) {
        owner = msg.sender;
        `;
    
    // Initialize chunk contracts
    for (let i = 0; i < chunkCount; i++) {
        routerContract += `chunks[${i}] = IPayoutTables7Chunk(chunk${i + 1});\n        `;
    }
    
    routerContract += `}
    
    /**
     * @dev Get payout type - first check math patterns, then route to appropriate chunk
     */
    function getPayoutType(uint256 combinationKey) external view returns (PayoutType) {
        // First check mathematical patterns for instant O(1) lookup
        PayoutType mathPattern = _checkMathematicalPatterns(combinationKey);
        if (mathPattern != PayoutType.LOSE) {
            return mathPattern;
        }
        
        // Route to appropriate chunk contract
        for (uint256 i = 0; i < ${chunkCount}; i++) {
            if (chunks[i].handlesKey(combinationKey)) {
                IPayoutTables7Chunk.PayoutType result = chunks[i].getPayoutType(combinationKey);
                return PayoutType(uint8(result));
            }
        }
        
        // Default to LOSE if no chunk handles it
        return PayoutType.LOSE;
    }
    
    /**
     * @dev Mathematical pattern detection (same as other contracts)
     */
    function _checkMathematicalPatterns(uint256 combinationKey) internal pure returns (PayoutType) {
        // Extract individual reels using assembly for gas efficiency
        uint256[${reelCount}] memory reels;
        uint256 temp = combinationKey;
        
        assembly {
            // Extract reels from right to left
            for { let i := 0 } lt(i, ${reelCount}) { i := add(i, 1) } {
                mstore(add(reels, mul(i, 32)), mod(temp, 10))
                temp := div(temp, 10)
            }
        }
        
        // Count symbols using assembly-optimized bit packing
        uint256 counts; // Pack all counts into single uint256 (6 symbols × 4 bits each)
        
        assembly {
            for { let i := 0 } lt(i, ${reelCount}) { i := add(i, 1) } {
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
        if (count6 == ${reelCount}) return PayoutType.JACKPOT;
        if (count5 == ${reelCount}) return PayoutType.ULTRA_WIN;
        if (count4 == ${reelCount}) return PayoutType.MEGA_WIN;
        if (count3 == ${reelCount}) return PayoutType.BIG_WIN;
        if (count2 == ${reelCount}) return PayoutType.MEDIUM_WIN;
        
        // Almost all patterns
        if (count6 == ${reelCount - 1}) return PayoutType.SPECIAL_COMBO;
        if (count5 == ${reelCount - 1}) return PayoutType.SPECIAL_COMBO;
        
        // Specific rocket patterns
        if (count5 == 3) return PayoutType.SPECIAL_COMBO;
        
        // Mixed high-value combinations
        if (count4 >= 2 && count5 >= 1) return PayoutType.SPECIAL_COMBO;
        if (count5 >= 2 && count4 >= 1) return PayoutType.SPECIAL_COMBO;
        
        // Triple+ patterns
        if (count6 >= 3) return PayoutType.MEGA_WIN;
        if (count5 >= 3) return PayoutType.BIG_WIN;
        if (count4 >= 3) return PayoutType.BIG_WIN;
        if (count3 >= 3) return PayoutType.MEDIUM_WIN;
        if (count2 >= 3) return PayoutType.MEDIUM_WIN;
        
        // 4+ patterns
        if (count6 >= 4) return PayoutType.MEGA_WIN;
        if (count5 >= 4) return PayoutType.MEGA_WIN;
        if (count4 >= 4) return PayoutType.MEGA_WIN;
        if (count3 >= 4) return PayoutType.BIG_WIN;
        if (count2 >= 4) return PayoutType.BIG_WIN;
        
        // Pair patterns
        if (count6 >= 2) return PayoutType.SMALL_WIN;
        if (count5 >= 2) return PayoutType.SMALL_WIN;
        if (count4 >= 2) return PayoutType.SMALL_WIN;
        
        return PayoutType.LOSE;
    }
    
    /**
     * @dev Get all chunk addresses
     */
    function getAllChunks() external view returns (address[${chunkCount}] memory) {
        address[${chunkCount}] memory chunkAddresses;
        for (uint256 i = 0; i < ${chunkCount}; i++) {
            chunkAddresses[i] = address(chunks[i]);
        }
        return chunkAddresses;
    }
    
    /**
     * @dev Update a chunk contract (for upgradeability)
     */
    function updateChunk(uint256 chunkIndex, address newChunk) external onlyOwner {
        require(chunkIndex < ${chunkCount}, "Invalid chunk index");
        chunks[chunkIndex] = IPayoutTables7Chunk(newChunk);
    }
}
`;
    
    return routerContract;
}

// Main execution
generateAllContracts(); 