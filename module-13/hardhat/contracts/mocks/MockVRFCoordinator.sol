// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title MockVRFCoordinator
 * @dev Mock VRF coordinator for testing
 */
contract MockVRFCoordinator {
    uint256 private nonce = 0;
    mapping(uint256 => address) private s_requesters;
    mapping(uint256 => uint256) private s_requests;
    
    /**
     * @notice Request random words with LINK payment or native payment
     */
    function requestRandomWords(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes memory _extraArgs
    ) external payable returns (uint256, uint256) {
        // For testing purposes, we'll just check if msg.value > 0 to determine if it's native payment
        bool nativePayment = msg.value > 0;
        
        // Generate request ID
        nonce++;
        uint256 reqId = uint256(keccak256(abi.encode(nonce, msg.sender, block.timestamp)));
        s_requesters[reqId] = msg.sender;
        s_requests[reqId] = _numWords;
        
        // Calculate payment amount
        uint256 payment = nativePayment ? msg.value : 0.01 ether; // Either ETH sent or mock LINK payment
        
        // Immediately fulfill the request in the same transaction for testing
        fulfillRandomWords(reqId);
        
        return (reqId, payment);
    }
    
    /**
     * @notice Get the fee for a VRF request
     */
    function calculateRequestPrice(uint32 _callbackGasLimit) external view returns (uint256) {
        return 0.01 ether; // Mock LINK fee
    }
    
    /**
     * @notice Get the status of a VRF request
     */
    function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint256[] memory randomWords) {
        uint256[] memory words = new uint256[](s_requests[_requestId]);
        for (uint256 i = 0; i < s_requests[_requestId]; i++) {
            words[i] = uint256(keccak256(abi.encode(_requestId, i)));
        }
        return (true, words);
    }
    
    /**
     * @notice Fulfill a VRF request
     */
    function fulfillRandomWords(uint256 _requestId) internal {
        address requester = s_requesters[_requestId];
        uint256 numWords = s_requests[_requestId];
        
        uint256[] memory randomWords = new uint256[](numWords);
        for (uint256 i = 0; i < numWords; i++) {
            randomWords[i] = uint256(keccak256(abi.encode(_requestId, i)));
        }
        
        // Call the requester's rawFulfillRandomWords function
        try MockVRFConsumer(requester).rawFulfillRandomWords(_requestId, randomWords) {
            // Success
        } catch {
            // Failed to fulfill, but we don't care for testing
        }
    }
    
    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
}

/**
 * @title MockVRFConsumer
 * @dev Interface for the VRF consumer contract
 */
interface MockVRFConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external;
} 