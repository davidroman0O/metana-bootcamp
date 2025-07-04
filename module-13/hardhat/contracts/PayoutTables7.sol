// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./interfaces/IPayoutTables.sol";

/**
 * @title PayoutTables7 - Router for chunked 7-reel payout lookup
 * @dev Routes to 8 chunk contracts for complete 7-reel coverage
 */
contract PayoutTables7 {
    
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
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType) {
        // First check mathematical patterns for instant O(1) lookup
        IPayoutTables.PayoutType mathPattern = _checkMathematicalPatterns(combinationKey);
        if (mathPattern != IPayoutTables.PayoutType.LOSE) {
            return mathPattern;
        }
        
        // Route to appropriate chunk contract
        for (uint256 i = 0; i < 8; i++) {
            if (chunks[i].handlesKey(combinationKey)) {
                return chunks[i].getPayoutType(combinationKey);
            }
        }
        
        // Default to LOSE if no chunk handles it
        return IPayoutTables.PayoutType.LOSE;
    }
    
    /**
     * @dev Mathematical pattern detection (same as other contracts)
     */
    function _checkMathematicalPatterns(uint256 combinationKey) internal pure returns (IPayoutTables.PayoutType) {
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
        if (count6 == 7) return IPayoutTables.PayoutType.JACKPOT;
        if (count5 == 7) return IPayoutTables.PayoutType.ULTRA_WIN;
        if (count4 == 7) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count3 == 7) return IPayoutTables.PayoutType.BIG_WIN;
        if (count2 == 7) return IPayoutTables.PayoutType.MEDIUM_WIN;
        
        // Almost all patterns
        if (count6 == 6) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        if (count5 == 6) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        
        // Specific rocket patterns
        if (count5 == 3) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        
        // Mixed high-value combinations
        if (count4 >= 2 && count5 >= 1) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        if (count5 >= 2 && count4 >= 1) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        
        // Triple+ patterns
        if (count6 >= 3) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count5 >= 3) return IPayoutTables.PayoutType.BIG_WIN;
        if (count4 >= 3) return IPayoutTables.PayoutType.BIG_WIN;
        if (count3 >= 3) return IPayoutTables.PayoutType.MEDIUM_WIN;
        if (count2 >= 3) return IPayoutTables.PayoutType.MEDIUM_WIN;
        
        // 4+ patterns
        if (count6 >= 4) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count5 >= 4) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count4 >= 4) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count3 >= 4) return IPayoutTables.PayoutType.BIG_WIN;
        if (count2 >= 4) return IPayoutTables.PayoutType.BIG_WIN;
        
        // Pair patterns: Only high-value symbols pay on pairs
        if (count6 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // Jackpot pairs
        if (count5 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // Rocket pairs
        if (count4 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // Diamond pairs
        // Removed: PUMP (3) and COPE (2) pairs - too common and generous!
        
        return IPayoutTables.PayoutType.LOSE;
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

// Interface for chunk contracts
interface IPayoutTables7Chunk {
    function handlesKey(uint256 combinationKey) external pure returns (bool);
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType);
}
