// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./interfaces/IPayoutTables.sol";

/**
 * @title PayoutTables7_Part8 - Chunked 7-reel payout lookup (Part 8/8)
 * @dev Handles combination keys 6622612 to 6665555 (211 cases)
 */
contract PayoutTables7_Part8 {
    
    // Key range for this chunk
    uint256 public constant MIN_KEY = 6622612;
    uint256 public constant MAX_KEY = 6665555;
    
    // Only store winning edge cases for this range
    mapping(uint256 => IPayoutTables.PayoutType) private edgeCases;
    
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
    function getPayoutType(uint256 combinationKey) external view returns (IPayoutTables.PayoutType) {
        require(combinationKey >= MIN_KEY && combinationKey <= MAX_KEY, "Key out of range");
        return edgeCases[combinationKey]; // Defaults to LOSE if not found
    }
    
    /**
     * @dev Initialize edge cases for this chunk
     */
    function _initializeEdgeCases() internal {
        // MEDIUM_WIN cases (145 total)
        edgeCases[6622612] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6622621] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6622622] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6622623] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6622624] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6622625] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6622632] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6622642] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6622652] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6623226] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6623262] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6623336] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6623363] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6623622] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6623633] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6624226] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6624262] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6624622] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6625226] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6625262] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6625622] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626122] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626212] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626221] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626223] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626224] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626225] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626232] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626242] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626252] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626322] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626333] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626422] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6626522] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6631111] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6631336] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6631363] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6631633] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6632226] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6632262] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6632336] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6632363] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6632622] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6632633] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633136] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633163] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633236] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633263] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633316] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633326] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633336] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633346] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633356] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633361] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633362] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633363] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633364] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633365] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633436] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633463] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633536] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633563] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633613] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633623] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633631] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633632] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633633] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633634] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633635] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633643] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6633653] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6634336] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6634363] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6634633] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6635336] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6635363] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6635633] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636133] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636233] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636313] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636323] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636331] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636332] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636333] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636334] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636335] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636343] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636353] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636433] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6636533] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6641111] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6642226] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6642262] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6642622] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6643336] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6643363] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6643633] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6646222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6646333] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6651111] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6652226] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6652262] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6652622] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6653336] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6653363] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6653633] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6656222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6656333] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6661111] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6661222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6661333] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662122] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662212] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662221] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662223] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662224] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662225] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662232] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662242] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662252] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662322] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662333] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662422] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6662522] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663133] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663233] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663313] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663323] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663331] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663332] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663333] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663334] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663335] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663343] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663353] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663433] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6663533] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6664222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6664333] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6665222] = IPayoutTables.PayoutType.MEDIUM_WIN;
        edgeCases[6665333] = IPayoutTables.PayoutType.MEDIUM_WIN;

        // BIG_WIN cases (66 total)
        edgeCases[6624446] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6624464] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6624644] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6626444] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6634446] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6634464] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6634644] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6636444] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6641446] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6641464] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6641644] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6642446] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6642464] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6642644] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6643446] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6643464] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6643644] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644146] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644164] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644246] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644264] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644346] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644364] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644416] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644426] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644436] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644446] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644461] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644462] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644463] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644464] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644614] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644624] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644634] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644641] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644642] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644643] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6644644] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646144] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646244] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646344] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646414] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646424] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646434] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646441] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646442] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646443] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6646444] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6655556] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6655565] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6655655] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6656555] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6661444] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6662444] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6663444] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664144] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664244] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664344] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664414] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664424] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664434] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664441] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664442] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664443] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6664444] = IPayoutTables.PayoutType.BIG_WIN;
        edgeCases[6665555] = IPayoutTables.PayoutType.BIG_WIN;
    }
}
