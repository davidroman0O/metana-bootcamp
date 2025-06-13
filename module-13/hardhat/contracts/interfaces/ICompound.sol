// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title Compound cEther Interface (for cETH)
 */
interface ICToken {
    function mint() external payable;
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow() external payable;
    function balanceOf(address owner) external view returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
    function getAccountSnapshot(address account) external view returns (uint, uint, uint, uint);
    function borrowBalanceStored(address account) external view returns (uint);
    function exchangeRateStored() external view returns (uint);
}

/**
 * @title Compound Comptroller Interface
 */
interface IComptroller {
    function enterMarkets(address[] calldata cTokens) external returns (uint[] memory);
    function exitMarket(address cToken) external returns (uint);
    function getAccountLiquidity(address account) external view returns (uint, uint, uint);
    function markets(address cToken) external view returns (bool, uint, bool);
    function getAssetsIn(address account) external view returns (address[] memory);
    function claimComp(address holder) external;
    function compAccrued(address holder) external view returns (uint);
} 