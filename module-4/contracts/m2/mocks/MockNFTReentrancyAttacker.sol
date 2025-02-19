// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExchangeVisageNFT} from "../ExchangeVisageNFT.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract MockNFTReentrancyAttacker is IERC721Receiver {
    ExchangeVisageNFT public nft;
    bool public attacking;

    constructor(address _nft) {
        nft = ExchangeVisageNFT(payable(_nft));
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public override returns (bytes4) {
        if (attacking) {
            attacking = false;
            // Try to trigger reentrancy by minting again
            nft.mint(address(this));
        }
        return this.onERC721Received.selector;
    }

    function attack() external {
        attacking = true;
        nft.mint(address(this));
    }

    function acceptNFTOwnership() external {
        nft.acceptOwnership();
    }
}