// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDex2 {
    function token1() external view returns (address);
    function token2() external view returns (address);
    function getSwapPrice(address from, address to, uint amount) external view returns(uint);
    function swap(address from, address to, uint amount) external;
    function approve(address spender, uint amount) external;
    function balanceOf(address token, address account) external view returns (uint);
    function owner() external view returns (address);
} 