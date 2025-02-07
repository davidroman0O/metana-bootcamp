// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

// 1 ether == 1000 tokens
// I'm not sure if i understood that decimal thing with that contract
contract ERCTokenSale is ERC20, Ownable2Step {

    uint256 constant public MAX_SUPPLY = 1_000_000 * 1e18; // scale to 18 decimal
    uint256 constant public TOKEN_PER_ETH = 1000 * 1e18; // 18 decimals too

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {

    } 

    fallback() external payable  {
        revert("You can't send ether with data on that contract");
    }

    event Mint(address indexed sender, uint256 ethSent, uint256 tokensMinted, uint256 totalSupplyBefore);

    function mintTokens() public payable {
         // require(msg.value % 1 ether == 0, "send a multiple of 1 ETH");
        require(msg.value > 0, "Must send ETH to mint tokens"); // whatever amount
        uint256 tokensToMint = (TOKEN_PER_ETH * msg.value) / 1 ether;
        require(totalSupply() + tokensToMint <= MAX_SUPPLY, "Purchase would exceed max token supply");
        emit Mint(msg.sender, msg.value, tokensToMint, totalSupply());
        super._mint(msg.sender, tokensToMint);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }

    receive() external payable {
        mintTokens();
    }

}
