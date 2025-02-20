// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExchangeVisageNFT} from "../02-Exchange.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockNFTReceiver is Ownable {
    ExchangeVisageNFT public nft;
    bool public shouldReject;

    constructor(address _nft) Ownable(msg.sender) {
        nft = ExchangeVisageNFT(payable(_nft));
    }

    function setReject(bool _shouldReject) external onlyOwner {
        shouldReject = _shouldReject;
    }

    // Accept ownership of the NFT contract
    function acceptOwnership() external onlyOwner {
        nft.acceptOwnership();
    }

    // This function will be called when attempting to withdraw
    receive() external payable {
        if (shouldReject) {
            revert("Rejecting ETH transfer");
        }
    }

    // function withdrawFromNFT() external onlyOwner {
    //     nft.withdraw();
    // }
}