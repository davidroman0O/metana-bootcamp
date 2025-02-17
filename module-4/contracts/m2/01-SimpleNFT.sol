// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // slither version constraint

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// Lot of slither false positives
contract FacesNFT is ERC721 {

    uint16 public constant MAX_SUPPLY = 10;
    uint16 public currentTokenId;

    constructor() ERC721("Echoforms", "ECHO") {
        currentTokenId = 0;
    }

    function mint() external {
        require(currentTokenId < MAX_SUPPLY, "Max supply reached");
        currentTokenId++;
        super._safeMint(msg.sender, currentTokenId);
    }

    fallback() external { // slither says that "payable" was useless 
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        revert("The NFT is free, no need to send ETH");
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
    }
}
 