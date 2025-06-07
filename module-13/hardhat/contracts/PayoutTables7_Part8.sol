// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title PayoutTables7_Part8 - Chunked 7-reel payout lookup (Part 8/8)
 * @dev Handles combination keys 6622612 to 6665555 (211 cases)
 */
contract PayoutTables7_Part8 {
    
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
    uint256 public constant MIN_KEY = 6622612;
    uint256 public constant MAX_KEY = 6665555;
    
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
    function _initializeEdgeCases() internal {
        // MEDIUM_WIN cases (145 total)
        edgeCases[6622612] = PayoutType.MEDIUM_WIN;
        edgeCases[6622621] = PayoutType.MEDIUM_WIN;
        edgeCases[6622622] = PayoutType.MEDIUM_WIN;
        edgeCases[6622623] = PayoutType.MEDIUM_WIN;
        edgeCases[6622624] = PayoutType.MEDIUM_WIN;
        edgeCases[6622625] = PayoutType.MEDIUM_WIN;
        edgeCases[6622632] = PayoutType.MEDIUM_WIN;
        edgeCases[6622642] = PayoutType.MEDIUM_WIN;
        edgeCases[6622652] = PayoutType.MEDIUM_WIN;
        edgeCases[6623226] = PayoutType.MEDIUM_WIN;
        edgeCases[6623262] = PayoutType.MEDIUM_WIN;
        edgeCases[6623336] = PayoutType.MEDIUM_WIN;
        edgeCases[6623363] = PayoutType.MEDIUM_WIN;
        edgeCases[6623622] = PayoutType.MEDIUM_WIN;
        edgeCases[6623633] = PayoutType.MEDIUM_WIN;
        edgeCases[6624226] = PayoutType.MEDIUM_WIN;
        edgeCases[6624262] = PayoutType.MEDIUM_WIN;
        edgeCases[6624622] = PayoutType.MEDIUM_WIN;
        edgeCases[6625226] = PayoutType.MEDIUM_WIN;
        edgeCases[6625262] = PayoutType.MEDIUM_WIN;
        edgeCases[6625622] = PayoutType.MEDIUM_WIN;
        edgeCases[6626122] = PayoutType.MEDIUM_WIN;
        edgeCases[6626212] = PayoutType.MEDIUM_WIN;
        edgeCases[6626221] = PayoutType.MEDIUM_WIN;
        edgeCases[6626222] = PayoutType.MEDIUM_WIN;
        edgeCases[6626223] = PayoutType.MEDIUM_WIN;
        edgeCases[6626224] = PayoutType.MEDIUM_WIN;
        edgeCases[6626225] = PayoutType.MEDIUM_WIN;
        edgeCases[6626232] = PayoutType.MEDIUM_WIN;
        edgeCases[6626242] = PayoutType.MEDIUM_WIN;
        edgeCases[6626252] = PayoutType.MEDIUM_WIN;
        edgeCases[6626322] = PayoutType.MEDIUM_WIN;
        edgeCases[6626333] = PayoutType.MEDIUM_WIN;
        edgeCases[6626422] = PayoutType.MEDIUM_WIN;
        edgeCases[6626522] = PayoutType.MEDIUM_WIN;
        edgeCases[6631111] = PayoutType.MEDIUM_WIN;
        edgeCases[6631336] = PayoutType.MEDIUM_WIN;
        edgeCases[6631363] = PayoutType.MEDIUM_WIN;
        edgeCases[6631633] = PayoutType.MEDIUM_WIN;
        edgeCases[6632226] = PayoutType.MEDIUM_WIN;
        edgeCases[6632262] = PayoutType.MEDIUM_WIN;
        edgeCases[6632336] = PayoutType.MEDIUM_WIN;
        edgeCases[6632363] = PayoutType.MEDIUM_WIN;
        edgeCases[6632622] = PayoutType.MEDIUM_WIN;
        edgeCases[6632633] = PayoutType.MEDIUM_WIN;
        edgeCases[6633136] = PayoutType.MEDIUM_WIN;
        edgeCases[6633163] = PayoutType.MEDIUM_WIN;
        edgeCases[6633236] = PayoutType.MEDIUM_WIN;
        edgeCases[6633263] = PayoutType.MEDIUM_WIN;
        edgeCases[6633316] = PayoutType.MEDIUM_WIN;
        edgeCases[6633326] = PayoutType.MEDIUM_WIN;
        edgeCases[6633336] = PayoutType.MEDIUM_WIN;
        edgeCases[6633346] = PayoutType.MEDIUM_WIN;
        edgeCases[6633356] = PayoutType.MEDIUM_WIN;
        edgeCases[6633361] = PayoutType.MEDIUM_WIN;
        edgeCases[6633362] = PayoutType.MEDIUM_WIN;
        edgeCases[6633363] = PayoutType.MEDIUM_WIN;
        edgeCases[6633364] = PayoutType.MEDIUM_WIN;
        edgeCases[6633365] = PayoutType.MEDIUM_WIN;
        edgeCases[6633436] = PayoutType.MEDIUM_WIN;
        edgeCases[6633463] = PayoutType.MEDIUM_WIN;
        edgeCases[6633536] = PayoutType.MEDIUM_WIN;
        edgeCases[6633563] = PayoutType.MEDIUM_WIN;
        edgeCases[6633613] = PayoutType.MEDIUM_WIN;
        edgeCases[6633623] = PayoutType.MEDIUM_WIN;
        edgeCases[6633631] = PayoutType.MEDIUM_WIN;
        edgeCases[6633632] = PayoutType.MEDIUM_WIN;
        edgeCases[6633633] = PayoutType.MEDIUM_WIN;
        edgeCases[6633634] = PayoutType.MEDIUM_WIN;
        edgeCases[6633635] = PayoutType.MEDIUM_WIN;
        edgeCases[6633643] = PayoutType.MEDIUM_WIN;
        edgeCases[6633653] = PayoutType.MEDIUM_WIN;
        edgeCases[6634336] = PayoutType.MEDIUM_WIN;
        edgeCases[6634363] = PayoutType.MEDIUM_WIN;
        edgeCases[6634633] = PayoutType.MEDIUM_WIN;
        edgeCases[6635336] = PayoutType.MEDIUM_WIN;
        edgeCases[6635363] = PayoutType.MEDIUM_WIN;
        edgeCases[6635633] = PayoutType.MEDIUM_WIN;
        edgeCases[6636133] = PayoutType.MEDIUM_WIN;
        edgeCases[6636222] = PayoutType.MEDIUM_WIN;
        edgeCases[6636233] = PayoutType.MEDIUM_WIN;
        edgeCases[6636313] = PayoutType.MEDIUM_WIN;
        edgeCases[6636323] = PayoutType.MEDIUM_WIN;
        edgeCases[6636331] = PayoutType.MEDIUM_WIN;
        edgeCases[6636332] = PayoutType.MEDIUM_WIN;
        edgeCases[6636333] = PayoutType.MEDIUM_WIN;
        edgeCases[6636334] = PayoutType.MEDIUM_WIN;
        edgeCases[6636335] = PayoutType.MEDIUM_WIN;
        edgeCases[6636343] = PayoutType.MEDIUM_WIN;
        edgeCases[6636353] = PayoutType.MEDIUM_WIN;
        edgeCases[6636433] = PayoutType.MEDIUM_WIN;
        edgeCases[6636533] = PayoutType.MEDIUM_WIN;
        edgeCases[6641111] = PayoutType.MEDIUM_WIN;
        edgeCases[6642226] = PayoutType.MEDIUM_WIN;
        edgeCases[6642262] = PayoutType.MEDIUM_WIN;
        edgeCases[6642622] = PayoutType.MEDIUM_WIN;
        edgeCases[6643336] = PayoutType.MEDIUM_WIN;
        edgeCases[6643363] = PayoutType.MEDIUM_WIN;
        edgeCases[6643633] = PayoutType.MEDIUM_WIN;
        edgeCases[6646222] = PayoutType.MEDIUM_WIN;
        edgeCases[6646333] = PayoutType.MEDIUM_WIN;
        edgeCases[6651111] = PayoutType.MEDIUM_WIN;
        edgeCases[6652226] = PayoutType.MEDIUM_WIN;
        edgeCases[6652262] = PayoutType.MEDIUM_WIN;
        edgeCases[6652622] = PayoutType.MEDIUM_WIN;
        edgeCases[6653336] = PayoutType.MEDIUM_WIN;
        edgeCases[6653363] = PayoutType.MEDIUM_WIN;
        edgeCases[6653633] = PayoutType.MEDIUM_WIN;
        edgeCases[6656222] = PayoutType.MEDIUM_WIN;
        edgeCases[6656333] = PayoutType.MEDIUM_WIN;
        edgeCases[6661111] = PayoutType.MEDIUM_WIN;
        edgeCases[6661222] = PayoutType.MEDIUM_WIN;
        edgeCases[6661333] = PayoutType.MEDIUM_WIN;
        edgeCases[6662122] = PayoutType.MEDIUM_WIN;
        edgeCases[6662212] = PayoutType.MEDIUM_WIN;
        edgeCases[6662221] = PayoutType.MEDIUM_WIN;
        edgeCases[6662222] = PayoutType.MEDIUM_WIN;
        edgeCases[6662223] = PayoutType.MEDIUM_WIN;
        edgeCases[6662224] = PayoutType.MEDIUM_WIN;
        edgeCases[6662225] = PayoutType.MEDIUM_WIN;
        edgeCases[6662232] = PayoutType.MEDIUM_WIN;
        edgeCases[6662242] = PayoutType.MEDIUM_WIN;
        edgeCases[6662252] = PayoutType.MEDIUM_WIN;
        edgeCases[6662322] = PayoutType.MEDIUM_WIN;
        edgeCases[6662333] = PayoutType.MEDIUM_WIN;
        edgeCases[6662422] = PayoutType.MEDIUM_WIN;
        edgeCases[6662522] = PayoutType.MEDIUM_WIN;
        edgeCases[6663133] = PayoutType.MEDIUM_WIN;
        edgeCases[6663222] = PayoutType.MEDIUM_WIN;
        edgeCases[6663233] = PayoutType.MEDIUM_WIN;
        edgeCases[6663313] = PayoutType.MEDIUM_WIN;
        edgeCases[6663323] = PayoutType.MEDIUM_WIN;
        edgeCases[6663331] = PayoutType.MEDIUM_WIN;
        edgeCases[6663332] = PayoutType.MEDIUM_WIN;
        edgeCases[6663333] = PayoutType.MEDIUM_WIN;
        edgeCases[6663334] = PayoutType.MEDIUM_WIN;
        edgeCases[6663335] = PayoutType.MEDIUM_WIN;
        edgeCases[6663343] = PayoutType.MEDIUM_WIN;
        edgeCases[6663353] = PayoutType.MEDIUM_WIN;
        edgeCases[6663433] = PayoutType.MEDIUM_WIN;
        edgeCases[6663533] = PayoutType.MEDIUM_WIN;
        edgeCases[6664222] = PayoutType.MEDIUM_WIN;
        edgeCases[6664333] = PayoutType.MEDIUM_WIN;
        edgeCases[6665222] = PayoutType.MEDIUM_WIN;
        edgeCases[6665333] = PayoutType.MEDIUM_WIN;

        // BIG_WIN cases (66 total)
        edgeCases[6624446] = PayoutType.BIG_WIN;
        edgeCases[6624464] = PayoutType.BIG_WIN;
        edgeCases[6624644] = PayoutType.BIG_WIN;
        edgeCases[6626444] = PayoutType.BIG_WIN;
        edgeCases[6634446] = PayoutType.BIG_WIN;
        edgeCases[6634464] = PayoutType.BIG_WIN;
        edgeCases[6634644] = PayoutType.BIG_WIN;
        edgeCases[6636444] = PayoutType.BIG_WIN;
        edgeCases[6641446] = PayoutType.BIG_WIN;
        edgeCases[6641464] = PayoutType.BIG_WIN;
        edgeCases[6641644] = PayoutType.BIG_WIN;
        edgeCases[6642446] = PayoutType.BIG_WIN;
        edgeCases[6642464] = PayoutType.BIG_WIN;
        edgeCases[6642644] = PayoutType.BIG_WIN;
        edgeCases[6643446] = PayoutType.BIG_WIN;
        edgeCases[6643464] = PayoutType.BIG_WIN;
        edgeCases[6643644] = PayoutType.BIG_WIN;
        edgeCases[6644146] = PayoutType.BIG_WIN;
        edgeCases[6644164] = PayoutType.BIG_WIN;
        edgeCases[6644246] = PayoutType.BIG_WIN;
        edgeCases[6644264] = PayoutType.BIG_WIN;
        edgeCases[6644346] = PayoutType.BIG_WIN;
        edgeCases[6644364] = PayoutType.BIG_WIN;
        edgeCases[6644416] = PayoutType.BIG_WIN;
        edgeCases[6644426] = PayoutType.BIG_WIN;
        edgeCases[6644436] = PayoutType.BIG_WIN;
        edgeCases[6644446] = PayoutType.BIG_WIN;
        edgeCases[6644461] = PayoutType.BIG_WIN;
        edgeCases[6644462] = PayoutType.BIG_WIN;
        edgeCases[6644463] = PayoutType.BIG_WIN;
        edgeCases[6644464] = PayoutType.BIG_WIN;
        edgeCases[6644614] = PayoutType.BIG_WIN;
        edgeCases[6644624] = PayoutType.BIG_WIN;
        edgeCases[6644634] = PayoutType.BIG_WIN;
        edgeCases[6644641] = PayoutType.BIG_WIN;
        edgeCases[6644642] = PayoutType.BIG_WIN;
        edgeCases[6644643] = PayoutType.BIG_WIN;
        edgeCases[6644644] = PayoutType.BIG_WIN;
        edgeCases[6646144] = PayoutType.BIG_WIN;
        edgeCases[6646244] = PayoutType.BIG_WIN;
        edgeCases[6646344] = PayoutType.BIG_WIN;
        edgeCases[6646414] = PayoutType.BIG_WIN;
        edgeCases[6646424] = PayoutType.BIG_WIN;
        edgeCases[6646434] = PayoutType.BIG_WIN;
        edgeCases[6646441] = PayoutType.BIG_WIN;
        edgeCases[6646442] = PayoutType.BIG_WIN;
        edgeCases[6646443] = PayoutType.BIG_WIN;
        edgeCases[6646444] = PayoutType.BIG_WIN;
        edgeCases[6655556] = PayoutType.BIG_WIN;
        edgeCases[6655565] = PayoutType.BIG_WIN;
        edgeCases[6655655] = PayoutType.BIG_WIN;
        edgeCases[6656555] = PayoutType.BIG_WIN;
        edgeCases[6661444] = PayoutType.BIG_WIN;
        edgeCases[6662444] = PayoutType.BIG_WIN;
        edgeCases[6663444] = PayoutType.BIG_WIN;
        edgeCases[6664144] = PayoutType.BIG_WIN;
        edgeCases[6664244] = PayoutType.BIG_WIN;
        edgeCases[6664344] = PayoutType.BIG_WIN;
        edgeCases[6664414] = PayoutType.BIG_WIN;
        edgeCases[6664424] = PayoutType.BIG_WIN;
        edgeCases[6664434] = PayoutType.BIG_WIN;
        edgeCases[6664441] = PayoutType.BIG_WIN;
        edgeCases[6664442] = PayoutType.BIG_WIN;
        edgeCases[6664443] = PayoutType.BIG_WIN;
        edgeCases[6664444] = PayoutType.BIG_WIN;
        edgeCases[6665555] = PayoutType.BIG_WIN;
    }
}
