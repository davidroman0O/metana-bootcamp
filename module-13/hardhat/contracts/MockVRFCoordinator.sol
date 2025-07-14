// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title MockVRFCoordinator
 * @dev Simple mock VRF coordinator for testing VRF v2.5
 */
contract MockVRFCoordinator {
    uint256 private requestIdCounter = 1;
    
    // VRF v2.5 interface
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external returns (uint256 requestId) {
        requestId = requestIdCounter++;
        return requestId;
    }
    
    // Legacy VRF v2 interface (kept for backward compatibility in tests)
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
    
    // VRF v2.5 Direct Funding with Native Payment (needed by CasinoSlot)
    function requestRandomWordsInNative(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes memory extraArgs
    ) external payable returns (uint256 requestId) {
        requestId = requestIdCounter++;
        return requestId;
    }
    
    function calculateRequestPriceNative(
        uint32 _callbackGasLimit,
        uint32 _numWords
    ) external pure returns (uint256) {
        // Return a fixed price for testing: 0.001 ETH
        return 0.001 ether;
    }
} 