// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./interfaces/IPayoutTables.sol";

/**
 * @title PayoutTables6 - Bit-packed 6-reel payout lookup
 * @dev Uses math patterns + bit-packing for 80.68% reduction
 * @notice Stores 506 winning edge cases in 376 packed slots vs 46656 total
 * @notice Removed 8510 LOSE cases (default to 0)
 */
contract PayoutTables6 {
    
    // Bit-packed storage: 10 payout types per uint256 (3 bits each)
    mapping(uint256 => uint256) private packedPayouts;
    
    constructor() {
        _initializePackedPayouts();
    }
    
    /**
     * @dev Ultra-optimized payout lookup with bit-packing
     */
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType) {
        // First check mathematical patterns
        IPayoutTables.PayoutType mathPattern = _checkMathematicalPatterns(combinationKey);
        if (mathPattern != IPayoutTables.PayoutType.LOSE) {
            return mathPattern;
        }
        
        // Fallback to bit-packed storage (defaults to LOSE if not found)
        return _getPackedPayoutType(combinationKey);
    }
    
    /**
     * @dev Get payout from bit-packed storage
     */
    function _getPackedPayoutType(uint256 combinationKey) internal view returns (IPayoutTables.PayoutType) {
        uint256 slotIndex = combinationKey / 10;
        uint256 positionInSlot = combinationKey % 10;
        
        uint256 packedData = packedPayouts[slotIndex];
        
        assembly {
            // Extract 3-bit payout type from packed data
            let shift := mul(positionInSlot, 3)
            packedData := and(shr(shift, packedData), 0x7) // 0x7 = 111 in binary
        }
        
        return IPayoutTables.PayoutType(packedData);
    }
    
    /**
     * @dev Mathematical pattern detection (same as standard version)
     */
    function _checkMathematicalPatterns(uint256 combinationKey) internal pure returns (IPayoutTables.PayoutType) {
        // Extract individual reels using assembly for gas efficiency
        uint256[6] memory reels;
        uint256 temp = combinationKey;
        
        assembly {
            // Extract reels from right to left
            for { let i := 0 } lt(i, 6) { i := add(i, 1) } {
                mstore(add(reels, mul(i, 32)), mod(temp, 10))
                temp := div(temp, 10)
            }
        }
        
        // Count symbols using assembly-optimized bit packing
        uint256 counts; // Pack all counts into single uint256 (6 symbols × 4 bits each)
        
        assembly {
            for { let i := 0 } lt(i, 6) { i := add(i, 1) } {
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
        if (count6 == 6) return IPayoutTables.PayoutType.JACKPOT;
        if (count5 == 6) return IPayoutTables.PayoutType.ULTRA_WIN;
        if (count4 == 6) return IPayoutTables.PayoutType.MEGA_WIN;
        if (count3 == 6) return IPayoutTables.PayoutType.BIG_WIN;
        if (count2 == 6) return IPayoutTables.PayoutType.MEDIUM_WIN;
        
        // Almost all patterns
        if (count6 == 5) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        if (count5 == 5) return IPayoutTables.PayoutType.SPECIAL_COMBO;
        
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
        if (count3 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // PUMP pairs
        if (count2 >= 2) return IPayoutTables.PayoutType.SMALL_WIN;  // COPE pairs
        
        return IPayoutTables.PayoutType.LOSE;
    }
    
    /**
     * @dev Initialize bit-packed payouts (only winning cases)
     */
    function _initializePackedPayouts() internal {
        packedPayouts[11111] = 599184;
        packedPayouts[11112] = 599184;
        packedPayouts[11113] = 599184;
        packedPayouts[11114] = 599184;
        packedPayouts[11115] = 599184;
        packedPayouts[11116] = 599184;
        packedPayouts[11121] = 599184;
        packedPayouts[11122] = 16;
        packedPayouts[11123] = 16;
        packedPayouts[11124] = 16;
        packedPayouts[11125] = 16;
        packedPayouts[11126] = 16;
        packedPayouts[11131] = 599184;
        packedPayouts[11132] = 16;
        packedPayouts[11133] = 16;
        packedPayouts[11134] = 16;
        packedPayouts[11135] = 16;
        packedPayouts[11136] = 16;
        packedPayouts[11141] = 599184;
        packedPayouts[11142] = 16;
        packedPayouts[11143] = 16;
        packedPayouts[11144] = 16;
        packedPayouts[11145] = 16;
        packedPayouts[11146] = 16;
        packedPayouts[11151] = 599184;
        packedPayouts[11152] = 16;
        packedPayouts[11153] = 16;
        packedPayouts[11154] = 16;
        packedPayouts[11155] = 16;
        packedPayouts[11156] = 16;
        packedPayouts[11161] = 599184;
        packedPayouts[11162] = 16;
        packedPayouts[11163] = 16;
        packedPayouts[11164] = 16;
        packedPayouts[11165] = 16;
        packedPayouts[11166] = 16;
        packedPayouts[11211] = 599184;
        packedPayouts[11212] = 16;
        packedPayouts[11213] = 16;
        packedPayouts[11214] = 16;
        packedPayouts[11215] = 16;
        packedPayouts[11216] = 16;
        packedPayouts[11221] = 16;
        packedPayouts[11231] = 16;
        packedPayouts[11241] = 16;
        packedPayouts[11251] = 16;
        packedPayouts[11261] = 16;
        packedPayouts[11311] = 599184;
        packedPayouts[11312] = 16;
        packedPayouts[11313] = 16;
        packedPayouts[11314] = 16;
        packedPayouts[11315] = 16;
        packedPayouts[11316] = 16;
        packedPayouts[11321] = 16;
        packedPayouts[11331] = 16;
        packedPayouts[11341] = 16;
        packedPayouts[11351] = 16;
        packedPayouts[11361] = 16;
        packedPayouts[11411] = 599184;
        packedPayouts[11412] = 16;
        packedPayouts[11413] = 16;
        packedPayouts[11414] = 16;
        packedPayouts[11415] = 16;
        packedPayouts[11416] = 16;
        packedPayouts[11421] = 16;
        packedPayouts[11431] = 16;
        packedPayouts[11441] = 16;
        packedPayouts[11451] = 16;
        packedPayouts[11461] = 16;
        packedPayouts[11511] = 599184;
        packedPayouts[11512] = 16;
        packedPayouts[11513] = 16;
        packedPayouts[11514] = 16;
        packedPayouts[11515] = 16;
        packedPayouts[11516] = 16;
        packedPayouts[11521] = 16;
        packedPayouts[11531] = 16;
        packedPayouts[11541] = 16;
        packedPayouts[11551] = 16;
        packedPayouts[11561] = 16;
        packedPayouts[11611] = 599184;
        packedPayouts[11612] = 16;
        packedPayouts[11613] = 16;
        packedPayouts[11614] = 16;
        packedPayouts[11615] = 16;
        packedPayouts[11616] = 16;
        packedPayouts[11621] = 16;
        packedPayouts[11631] = 16;
        packedPayouts[11641] = 16;
        packedPayouts[11651] = 16;
        packedPayouts[11661] = 16;
        packedPayouts[12111] = 599184;
        packedPayouts[12112] = 16;
        packedPayouts[12113] = 16;
        packedPayouts[12114] = 16;
        packedPayouts[12115] = 16;
        packedPayouts[12116] = 16;
        packedPayouts[12121] = 16;
        packedPayouts[12131] = 16;
        packedPayouts[12141] = 16;
        packedPayouts[12151] = 16;
        packedPayouts[12161] = 16;
        packedPayouts[12211] = 16;
        packedPayouts[12311] = 16;
        packedPayouts[12411] = 16;
        packedPayouts[12511] = 16;
        packedPayouts[12611] = 16;
        packedPayouts[13111] = 599184;
        packedPayouts[13112] = 16;
        packedPayouts[13113] = 16;
        packedPayouts[13114] = 16;
        packedPayouts[13115] = 16;
        packedPayouts[13116] = 16;
        packedPayouts[13121] = 16;
        packedPayouts[13131] = 16;
        packedPayouts[13141] = 16;
        packedPayouts[13151] = 16;
        packedPayouts[13161] = 16;
        packedPayouts[13211] = 16;
        packedPayouts[13311] = 16;
        packedPayouts[13411] = 16;
        packedPayouts[13511] = 16;
        packedPayouts[13611] = 16;
        packedPayouts[14111] = 599184;
        packedPayouts[14112] = 16;
        packedPayouts[14113] = 16;
        packedPayouts[14114] = 16;
        packedPayouts[14115] = 16;
        packedPayouts[14116] = 16;
        packedPayouts[14121] = 16;
        packedPayouts[14131] = 16;
        packedPayouts[14141] = 16;
        packedPayouts[14151] = 16;
        packedPayouts[14161] = 16;
        packedPayouts[14211] = 16;
        packedPayouts[14311] = 16;
        packedPayouts[14411] = 16;
        packedPayouts[14511] = 16;
        packedPayouts[14611] = 16;
        packedPayouts[15111] = 599184;
        packedPayouts[15112] = 16;
        packedPayouts[15113] = 16;
        packedPayouts[15114] = 16;
        packedPayouts[15115] = 16;
        packedPayouts[15116] = 16;
        packedPayouts[15121] = 16;
        packedPayouts[15131] = 16;
        packedPayouts[15141] = 16;
        packedPayouts[15151] = 16;
        packedPayouts[15161] = 16;
        packedPayouts[15211] = 16;
        packedPayouts[15311] = 16;
        packedPayouts[15411] = 16;
        packedPayouts[15511] = 16;
        packedPayouts[15611] = 16;
        packedPayouts[16111] = 599184;
        packedPayouts[16112] = 16;
        packedPayouts[16113] = 16;
        packedPayouts[16114] = 16;
        packedPayouts[16115] = 16;
        packedPayouts[16116] = 16;
        packedPayouts[16121] = 16;
        packedPayouts[16131] = 16;
        packedPayouts[16141] = 16;
        packedPayouts[16151] = 16;
        packedPayouts[16161] = 16;
        packedPayouts[16211] = 16;
        packedPayouts[16311] = 16;
        packedPayouts[16411] = 16;
        packedPayouts[16511] = 16;
        packedPayouts[16611] = 16;
        packedPayouts[21111] = 599184;
        packedPayouts[21112] = 16;
        packedPayouts[21113] = 16;
        packedPayouts[21114] = 16;
        packedPayouts[21115] = 16;
        packedPayouts[21116] = 16;
        packedPayouts[21121] = 16;
        packedPayouts[21131] = 16;
        packedPayouts[21141] = 16;
        packedPayouts[21151] = 16;
        packedPayouts[21161] = 16;
        packedPayouts[21211] = 16;
        packedPayouts[21311] = 16;
        packedPayouts[21411] = 16;
        packedPayouts[21511] = 16;
        packedPayouts[21611] = 16;
        packedPayouts[22111] = 16;
        packedPayouts[22244] = 8192;
        packedPayouts[22266] = 524288;
        packedPayouts[22424] = 8192;
        packedPayouts[22442] = 8192;
        packedPayouts[22444] = 128;
        packedPayouts[22626] = 524288;
        packedPayouts[22662] = 524288;
        packedPayouts[22666] = 128;
        packedPayouts[23111] = 16;
        packedPayouts[24111] = 16;
        packedPayouts[24224] = 8192;
        packedPayouts[24242] = 8192;
        packedPayouts[24244] = 128;
        packedPayouts[24422] = 8192;
        packedPayouts[24424] = 128;
        packedPayouts[24442] = 128;
        packedPayouts[25111] = 16;
        packedPayouts[26111] = 16;
        packedPayouts[26226] = 524288;
        packedPayouts[26262] = 524288;
        packedPayouts[26266] = 128;
        packedPayouts[26622] = 524288;
        packedPayouts[26626] = 128;
        packedPayouts[26662] = 128;
        packedPayouts[31111] = 599184;
        packedPayouts[31112] = 16;
        packedPayouts[31113] = 16;
        packedPayouts[31114] = 16;
        packedPayouts[31115] = 16;
        packedPayouts[31116] = 16;
        packedPayouts[31121] = 16;
        packedPayouts[31131] = 16;
        packedPayouts[31141] = 16;
        packedPayouts[31151] = 16;
        packedPayouts[31161] = 16;
        packedPayouts[31211] = 16;
        packedPayouts[31311] = 16;
        packedPayouts[31411] = 16;
        packedPayouts[31511] = 16;
        packedPayouts[31611] = 16;
        packedPayouts[32111] = 16;
        packedPayouts[33111] = 16;
        packedPayouts[33344] = 8192;
        packedPayouts[33366] = 524288;
        packedPayouts[33434] = 8192;
        packedPayouts[33443] = 8192;
        packedPayouts[33444] = 1024;
        packedPayouts[33636] = 524288;
        packedPayouts[33663] = 524288;
        packedPayouts[33666] = 1024;
        packedPayouts[34111] = 16;
        packedPayouts[34334] = 8192;
        packedPayouts[34343] = 8192;
        packedPayouts[34344] = 1024;
        packedPayouts[34433] = 8192;
        packedPayouts[34434] = 1024;
        packedPayouts[34443] = 1024;
        packedPayouts[35111] = 16;
        packedPayouts[36111] = 16;
        packedPayouts[36336] = 524288;
        packedPayouts[36363] = 524288;
        packedPayouts[36366] = 1024;
        packedPayouts[36633] = 524288;
        packedPayouts[36636] = 1024;
        packedPayouts[36663] = 1024;
        packedPayouts[41111] = 599184;
        packedPayouts[41112] = 16;
        packedPayouts[41113] = 16;
        packedPayouts[41114] = 16;
        packedPayouts[41115] = 16;
        packedPayouts[41116] = 16;
        packedPayouts[41121] = 16;
        packedPayouts[41131] = 16;
        packedPayouts[41141] = 16;
        packedPayouts[41151] = 16;
        packedPayouts[41161] = 16;
        packedPayouts[41211] = 16;
        packedPayouts[41311] = 16;
        packedPayouts[41411] = 16;
        packedPayouts[41511] = 16;
        packedPayouts[41611] = 16;
        packedPayouts[42111] = 16;
        packedPayouts[42224] = 8192;
        packedPayouts[42242] = 8192;
        packedPayouts[42244] = 128;
        packedPayouts[42422] = 8192;
        packedPayouts[42424] = 128;
        packedPayouts[42442] = 128;
        packedPayouts[43111] = 16;
        packedPayouts[43334] = 8192;
        packedPayouts[43343] = 8192;
        packedPayouts[43344] = 1024;
        packedPayouts[43433] = 8192;
        packedPayouts[43434] = 1024;
        packedPayouts[43443] = 1024;
        packedPayouts[44111] = 16;
        packedPayouts[44222] = 8192;
        packedPayouts[44224] = 128;
        packedPayouts[44242] = 128;
        packedPayouts[44333] = 8192;
        packedPayouts[44334] = 1024;
        packedPayouts[44343] = 1024;
        packedPayouts[44422] = 128;
        packedPayouts[44433] = 1024;
        packedPayouts[44466] = 786432;
        packedPayouts[44646] = 786432;
        packedPayouts[44664] = 786432;
        packedPayouts[44666] = 12288;
        packedPayouts[45111] = 16;
        packedPayouts[46111] = 16;
        packedPayouts[46446] = 786432;
        packedPayouts[46464] = 786432;
        packedPayouts[46466] = 12288;
        packedPayouts[46644] = 786432;
        packedPayouts[46646] = 12288;
        packedPayouts[46664] = 12288;
        packedPayouts[51111] = 599184;
        packedPayouts[51112] = 16;
        packedPayouts[51113] = 16;
        packedPayouts[51114] = 16;
        packedPayouts[51115] = 16;
        packedPayouts[51116] = 16;
        packedPayouts[51121] = 16;
        packedPayouts[51131] = 16;
        packedPayouts[51141] = 16;
        packedPayouts[51151] = 16;
        packedPayouts[51161] = 16;
        packedPayouts[51211] = 16;
        packedPayouts[51311] = 16;
        packedPayouts[51411] = 16;
        packedPayouts[51511] = 16;
        packedPayouts[51611] = 16;
        packedPayouts[52111] = 16;
        packedPayouts[53111] = 16;
        packedPayouts[54111] = 16;
        packedPayouts[55111] = 16;
        packedPayouts[56111] = 16;
        packedPayouts[61111] = 599184;
        packedPayouts[61112] = 16;
        packedPayouts[61113] = 16;
        packedPayouts[61114] = 16;
        packedPayouts[61115] = 16;
        packedPayouts[61116] = 16;
        packedPayouts[61121] = 16;
        packedPayouts[61131] = 16;
        packedPayouts[61141] = 16;
        packedPayouts[61151] = 16;
        packedPayouts[61161] = 16;
        packedPayouts[61211] = 16;
        packedPayouts[61311] = 16;
        packedPayouts[61411] = 16;
        packedPayouts[61511] = 16;
        packedPayouts[61611] = 16;
        packedPayouts[62111] = 16;
        packedPayouts[62226] = 524288;
        packedPayouts[62262] = 524288;
        packedPayouts[62266] = 128;
        packedPayouts[62622] = 524288;
        packedPayouts[62626] = 128;
        packedPayouts[62662] = 128;
        packedPayouts[63111] = 16;
        packedPayouts[63336] = 524288;
        packedPayouts[63363] = 524288;
        packedPayouts[63366] = 1024;
        packedPayouts[63633] = 524288;
        packedPayouts[63636] = 1024;
        packedPayouts[63663] = 1024;
        packedPayouts[64111] = 16;
        packedPayouts[64446] = 786432;
        packedPayouts[64464] = 786432;
        packedPayouts[64466] = 12288;
        packedPayouts[64644] = 786432;
        packedPayouts[64646] = 12288;
        packedPayouts[64664] = 12288;
        packedPayouts[65111] = 16;
        packedPayouts[66111] = 16;
        packedPayouts[66222] = 524288;
        packedPayouts[66226] = 128;
        packedPayouts[66262] = 128;
        packedPayouts[66333] = 524288;
        packedPayouts[66336] = 1024;
        packedPayouts[66363] = 1024;
        packedPayouts[66444] = 786432;
        packedPayouts[66446] = 12288;
        packedPayouts[66464] = 12288;
        packedPayouts[66622] = 128;
        packedPayouts[66633] = 1024;
        packedPayouts[66644] = 12288;
    }
}
