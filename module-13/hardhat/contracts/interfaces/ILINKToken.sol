// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title LINK Token Interface
 * @dev Interface for Chainlink LINK token operations
 */
interface ILINKToken {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
} 