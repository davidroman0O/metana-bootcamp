// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title Chainlink VRF Interface
 */
interface IVRFCoordinator {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
} 