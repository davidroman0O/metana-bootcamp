// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VisageStaking} from "../staking.sol";
import {StakingVisageToken} from "../staking.sol";
import {StakingVisageNFT} from "../staking.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract MockStakingReentrancyAttacker is IERC721Receiver {
    VisageStaking public staking;
    StakingVisageToken public token;
    StakingVisageNFT public nft;
    bool public attacking;

    constructor(address _staking, address _token, address _nft) {
        staking = VisageStaking(payable(_staking));
        token = StakingVisageToken(payable(_token));
        nft = StakingVisageNFT(payable(_nft));
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public override returns (bytes4) {
        if (attacking) {
            attacking = false;
            // Try to reenter unstakeNFT during the NFT transfer
            staking.unstakeNFT(1);
        }
        return this.onERC721Received.selector;
    }

    function attackUnstake(uint256 tokenId) external {
        attacking = true;
        staking.unstakeNFT(tokenId);
    }

    // Helper function to transfer NFT to staking contract
    function transferNFTToStaking(uint256 tokenId) external {
        nft.safeTransferFrom(address(this), address(staking), tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        nft.setApprovalForAll(operator, approved);
    }

    // Standard receive function to handle ETH
    receive() external payable {}
}