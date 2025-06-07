// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title PayoutTables7 - Router for chunked 7-reel payout lookup
 * @dev Routes to 8 chunk contracts for complete 7-reel coverage
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
    IPayoutTables7Chunk[8] public chunks;
    
    // Owner for upgradeability
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(address chunk1, address chunk2, address chunk3, address chunk4, address chunk5, address chunk6, address chunk7, address chunk8) {
        owner = msg.sender;
        chunks[0] = IPayoutTables7Chunk(chunk1);
        chunks[1] = IPayoutTables7Chunk(chunk2);
        chunks[2] = IPayoutTables7Chunk(chunk3);
        chunks[3] = IPayoutTables7Chunk(chunk4);
        chunks[4] = IPayoutTables7Chunk(chunk5);
        chunks[5] = IPayoutTables7Chunk(chunk6);
        chunks[6] = IPayoutTables7Chunk(chunk7);
        chunks[7] = IPayoutTables7Chunk(chunk8);
        }
    
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
        for (uint256 i = 0; i < 8; i++) {
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
        uint256[7] memory reels;
        uint256 temp = combinationKey;
        
        assembly {
            // Extract reels from right to left
            for { let i := 0 } lt(i, 7) { i := add(i, 1) } {
                mstore(add(reels, mul(i, 32)), mod(temp, 10))
                temp := div(temp, 10)
            }
        }
        
        // Count symbols using assembly-optimized bit packing
        uint256 counts; // Pack all counts into single uint256 (6 symbols × 4 bits each)
        
        assembly {
            for { let i := 0 } lt(i, 7) { i := add(i, 1) } {
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
        if (count6 == 7) return PayoutType.JACKPOT;
        if (count5 == 7) return PayoutType.ULTRA_WIN;
        if (count4 == 7) return PayoutType.MEGA_WIN;
        if (count3 == 7) return PayoutType.BIG_WIN;
        if (count2 == 7) return PayoutType.MEDIUM_WIN;
        
        // Almost all patterns
        if (count6 == 6) return PayoutType.SPECIAL_COMBO;
        if (count5 == 6) return PayoutType.SPECIAL_COMBO;
        
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
    function getAllChunks() external view returns (address[8] memory) {
        address[8] memory chunkAddresses;
        for (uint256 i = 0; i < 8; i++) {
            chunkAddresses[i] = address(chunks[i]);
        }
        return chunkAddresses;
    }
    
    /**
     * @dev Update a chunk contract (for upgradeability)
     */
    function updateChunk(uint256 chunkIndex, address newChunk) external onlyOwner {
        require(chunkIndex < 8, "Invalid chunk index");
        chunks[chunkIndex] = IPayoutTables7Chunk(newChunk);
    }
}
