// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

// Open Remix, build it, deploy it
contract ERCGod is ERC20, Ownable2Step {

    constructor(string memory name_, string memory symbol_) // literally copied from the ERC20 constructor
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {}

    function mintTokensToAddress(address recipient, uint256 amount)  public virtual onlyOwner {
        _mint(recipient, amount);
    }

    // if i understood right it's amount minting and burning
    function changeBalanceAtAddress(address target, uint256 amount) public virtual onlyOwner {
        require(target != address(0), "must specify target");
        uint256 tokenBalance = balanceOf(target);
        if (tokenBalance < amount) { // if you got less that the target, mint it
            _mint(target, amount - tokenBalance); // short-circuit
        } else { // else well... burn it
            _burn(target, tokenBalance - amount); // short-circuit
        }
    }

    // be an asshole and move the funds from one wallet to another
    function authoritativeTransferFrom(address from, address to) public virtual onlyOwner {
        _transfer(from, to, balanceOf(from));    
    }
    
}