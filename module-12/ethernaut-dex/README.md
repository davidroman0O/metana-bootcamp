# Ethernaut Dex1 Challenge (frontend) Solution 

Lazy multi-transactions solution with a simple script that interact with the contract demonstrating that not only you can be vulnerable with another contract attacker but also leveraging your protocol.

## The Exploit

the dex uses a flawed pricing formula: `getSwapPrice = (amount * to_balance) / from_balance`

this formula doesn't account for slippage and can be manipulated by alternating swaps between token1 and token2. each swap changes the token ratios in the dex, making subsequent swaps more favorable to the attacker.

**attack flow:**
- start: player(10,10) | dex(100,100) 
- swap 1: player(0,20) | dex(110,90) // 10→10 tokens
- swap 2: player(24,0) | dex(86,110) // 20→24 tokens ✨ 
- swap 3: player(0,30) | dex(110,80) // 24→30 tokens ✨
- continue alternating until you can drain one token completely

the key insight: each swap gets you slightly more tokens than a "fair" exchange because the pricing formula creates arbitrage opportunities. the dex has no slippage protection, so you compound these small gains until you can calculate the exact amount to drain all remaining tokens of one type.

**tldr:** flawed pricing formula + no slippage protection + alternating swaps = complete token drain

Vulnerable contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "openzeppelin-contracts-08/token/ERC20/IERC20.sol";
import "openzeppelin-contracts-08/token/ERC20/ERC20.sol";
import "openzeppelin-contracts-08/access/Ownable.sol";

contract Dex is Ownable {
    address public token1;
    address public token2;

    constructor() {}

    function setTokens(address _token1, address _token2) public onlyOwner {
        token1 = _token1;
        token2 = _token2;
    }

    function addLiquidity(address token_address, uint256 amount) public onlyOwner {
        IERC20(token_address).transferFrom(msg.sender, address(this), amount);
    }

    function swap(address from, address to, uint256 amount) public {
        require((from == token1 && to == token2) || (from == token2 && to == token1), "Invalid tokens");
        require(IERC20(from).balanceOf(msg.sender) >= amount, "Not enough to swap");
        uint256 swapAmount = getSwapPrice(from, to, amount);
        IERC20(from).transferFrom(msg.sender, address(this), amount);
        IERC20(to).approve(address(this), swapAmount);
        IERC20(to).transferFrom(address(this), msg.sender, swapAmount);
    }

    function getSwapPrice(address from, address to, uint256 amount) public view returns (uint256) {
        return ((amount * IERC20(to).balanceOf(address(this))) / IERC20(from).balanceOf(address(this)));
    }

    function approve(address spender, uint256 amount) public {
        SwappableToken(token1).approve(msg.sender, spender, amount);
        SwappableToken(token2).approve(msg.sender, spender, amount);
    }

    function balanceOf(address token, address account) public view returns (uint256) {
        return IERC20(token).balanceOf(account);
    }
}

contract SwappableToken is ERC20 {
    address private _dex;

    constructor(address dexInstance, string memory name, string memory symbol, uint256 initialSupply)
        ERC20(name, symbol)
    {
        _mint(msg.sender, initialSupply);
        _dex = dexInstance;
    }

    function approve(address owner, address spender, uint256 amount) public {
        require(owner != _dex, "InvalidApprover");
        super._approve(owner, spender, amount);
    }
}
```

