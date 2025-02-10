// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract FacesNFT is ERC721 {

    constructor() ERC721("Echoforms", "ECHO") {
        for (uint16 i = 1; i < 11; i++) {
            super._safeMint(msg.sender, i);
        }
    }

    fallback() external payable {
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        revert("The NFT is free, no need to send ETH");
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
    }
}
 