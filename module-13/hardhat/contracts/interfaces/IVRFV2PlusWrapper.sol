// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IVRFV2PlusWrapper
 * @dev Interface for Chainlink VRF V2 Plus Wrapper
 */
interface IVRFV2PlusWrapper {
    /**
     * @notice Request random words from the VRF V2 Plus wrapper with LINK payment
     * @param _callbackGasLimit Maximum gas used to fulfill the request
     * @param _requestConfirmations Number of confirmations to wait before fulfilling the request
     * @param _numWords Number of random words to request
     * @param _extraArgs Extra arguments to pass to the VRF V2 Plus wrapper
     * @return requestId The ID of the request
     * @return paid The amount paid for the request
     */
    function requestRandomWords(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes memory _extraArgs
    ) external returns (uint256 requestId, uint256 paid);
    
    /**
     * @notice Get the fee for a VRF request
     * @param _callbackGasLimit Maximum gas used to fulfill the request
     * @return The fee in LINK wei
     */
    function calculateRequestPrice(uint32 _callbackGasLimit) external view returns (uint256);

    /**
     * @notice Get the status of a request.
     * @param _requestId The ID of the request.
     * @return fulfilled - Whether the request has been fulfilled.
     * @return randomWords - The random words generated from the request.
     */
    function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint256[] memory randomWords);

    /**
     * @notice Get the last request ID.
     * @return The last request ID.
     */
    function lastRequestId() external view returns (uint256);
} 