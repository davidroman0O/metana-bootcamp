// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title MockVRFCoordinator
 * @dev Simple mock VRF coordinator for testing
 */
contract MockVRFCoordinator {
    uint256 private requestIdCounter = 1;
    
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId) {
        requestId = requestIdCounter++;
        return requestId;
    }
} 