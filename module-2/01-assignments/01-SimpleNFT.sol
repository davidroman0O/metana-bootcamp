// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// Online already https://opensea.io/collection/echoforms
// Verified https://polygonscan.com/address/0xb666b27e3a7cffd89a49d820ed65d94cdd1f428c#code
// https://polygonscan.com/verifyContract-solc-json?a=0xb666b27e3a7cffd89a49d820ed65d94cdd1f428c&c=v0.8.26%2bcommit.8a97fa7a&lictype=3
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
 