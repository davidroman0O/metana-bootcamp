// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

// 1 ether == 1000 tokens
// I'm not sure if i understood that decimal thing with that contract
contract ERCTokenSale is ERC20, Ownable2Step {

    uint256 constant public MAX_SUPPLY = 1_000_000; // 1M tokens max

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {
        _transferOwnership(msg.sender);
    } 

    fallback() external payable  {
        revert("You can't send ether with data on that contract");
    }

    function mintTokens() public payable {
        require(msg.value % 1 ether == 0, "send a multiple of 1 ETH");
        require(totalSupply() <= MAX_SUPPLY, "cannot mint more tokens");
        uint256 minter = 1000 * (msg.value / 1 ether);
        require(totalSupply() + minter <= MAX_SUPPLY, "cannot mint more excess tokens");
        super._mint(owner(), 1000 * (msg.value / 1 ether));
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }

    receive() external payable {
        mintTokens();
    }

}