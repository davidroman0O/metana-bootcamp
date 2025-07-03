// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockUniswapRouter
 * @dev Mock Uniswap router for testing
 */
contract MockUniswapRouter {
    address public WETH;
    IERC20 public linkToken;
    
    constructor(address _linkToken) {
        WETH = address(this);
        linkToken = IERC20(_linkToken);
    }
    
    /**
     * @notice Swap ETH for tokens
     */
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        require(path[0] == WETH, "Invalid path[0]");
        require(path[path.length - 1] == address(linkToken), "Invalid path end");
        require(deadline >= block.timestamp, "Expired");
        
        // Calculate output amount (1 ETH = 10 LINK for simplicity)
        uint256 linkAmount = msg.value * 10;
        require(linkAmount >= amountOutMin, "Insufficient output amount");
        
        // Mock transfer LINK to recipient
        require(linkToken.transfer(to, linkAmount), "Transfer failed");
        
        // Return amounts
        amounts = new uint256[](path.length);
        amounts[0] = msg.value;
        amounts[path.length - 1] = linkAmount;
        
        return amounts;
    }
    
    /**
     * @notice Get amounts out
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        // Calculate output amount (1 ETH = 10 LINK for simplicity)
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        if (path[0] == WETH && path[path.length - 1] == address(linkToken)) {
            amounts[path.length - 1] = amountIn * 10;
        } else {
            amounts[path.length - 1] = amountIn;
        }
        
        return amounts;
    }
    
    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
} 