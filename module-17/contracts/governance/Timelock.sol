// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title Timelock
 * @dev Standard timelock controller with minimal view helper
 * 
 * Features:
 * - Standard timelock functionality
 * - Configurable delay
 * - Role-based access control
 * - Convenience view function for remaining delay
 */
contract Timelock is TimelockController {
    
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
    
    /**
     * @dev Returns the remaining delay for an operation
     * @param operationId The operation to check
     * @return The remaining delay in seconds, or 0 if ready/executed
     */
    function getRemainingDelay(bytes32 operationId) 
        external 
        view 
        returns (uint256) 
    {
        uint256 timestamp = getTimestamp(operationId);
        if (block.timestamp >= timestamp) return 0;
        return timestamp - block.timestamp;
    }
    
}