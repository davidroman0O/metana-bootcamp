// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {StakingVisageNFT} from "../staking.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract MockStakingNFTReentrancyAttacker is IERC721Receiver {
    StakingVisageNFT public nft;
    bool public attacking;

    constructor(address _nft) {
        nft = StakingVisageNFT(payable(_nft));
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        if (attacking) {
            attacking = false;
            // Try to reenter mint during the _safeMint callback
            nft.mint(address(this));
        }
        return this.onERC721Received.selector;
    }

    function attack() external {
        attacking = true;
        // First mint will call _safeMint which triggers onERC721Received
        nft.mint(address(this));
    }

    function acceptNFTOwnership() external {
        nft.acceptOwnership();
    }
}