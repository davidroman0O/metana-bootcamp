// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IPayoutTables {
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
    
    function getPayoutType(uint8 reelCount, uint256 combinationKey) external view returns (PayoutType);
} 