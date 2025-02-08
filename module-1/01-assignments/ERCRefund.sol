// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

// 1 ether == 1000 tokens
contract ERCRefund is ERC20, Ownable2Step {
    // MAX_SUPPLY = 1_000_000 was too small because it's not accounting for the decimals
    // My brain didn't accounted for the fungability of tokens... not i understand
    uint256 constant public MAX_SUPPLY = 1_000_000 * 1e18; // scale to 18 decimal
    uint256 constant public TOKEN_PER_ETH = 1000 * 1e18; // 18 decimals too
    
    constructor() ERC20("Refund", "RFD") Ownable(msg.sender) 
    {
    } 

    fallback() external payable  {
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        mintTokens();
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        if (from == address(0)) {  // If minting
            require(totalSupply() + value <= MAX_SUPPLY, "Cap exceeded");
        }
        super._update(from, to, value);
    }

    event Mint(address indexed sender, uint256 ethSent, uint256 tokensMinted, uint256 totalSupplyBefore);

    function mintTokens() public payable {
        // require(msg.value % 1 ether == 0, "send a multiple of 1 ETH");
        require(msg.value > 0, "Must send ETH to mint tokens"); // whatever amount
        // I understood why now
        // - without 1 ether it would be a really big number
        // - meaning that if you sent 1 wei you would have your 1000 tokens with 18 decimals!!
        // - we want 1 ether == 1000 tokens, taking in account the 18 decimals 
        // - we must do the multiplicaiton first to avoid rounding errors in integer division
        uint256 tokensToMint = (TOKEN_PER_ETH * msg.value) / 1 ether;
        emit Mint(msg.sender, msg.value, tokensToMint, totalSupply());
        _mint(msg.sender, tokensToMint); // _update will manage the cap
        // and so normally after sending 1 ether, you will have a balance of `1000000000000000000000`
        // which is 1000.000000000000000000 aka with 18 decimals
    }
    
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }

    event Selling(address indexed sender, uint256 amount, uint256 ethSet, uint256 totalSupplyBefore);

    // the amount will be with decimals
    function sellBack(uint256 amount) external {
        require(amount > 0, "cannot sell 0 tokens");
        // Similar thing as for mintTokens
        uint256 etherToSendBack = (amount * 0.5 ether) / 1000 ether; // 0.5 for every 1000 tokens
        require(address(this).balance >= etherToSendBack, "contract is broke");
        _transfer(msg.sender, address(this), amount); // get the token from the wallet
        (bool success, ) = payable(msg.sender).call{value: etherToSendBack}(""); // after looking at my notes of the smartcontractprogrammer, call is prefered
        require(success, "ETH transfer failed");
        emit Selling(msg.sender, amount, etherToSendBack, totalSupply());
    }
}