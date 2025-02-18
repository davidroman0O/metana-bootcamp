// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../erc1155.sol";

contract MockFreeMintReentrancyAttacker {
    ERC1155Token public token;
    bool public attacking;

    constructor(address _token) {
        token = ERC1155Token(payable(_token));
    }

    function attack() external {
        attacking = true;
        token.freeMint(0);
    }

    // This fallback is required to receive ERC1155 tokens
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public returns (bytes4) {
        if (attacking) {
            attacking = false;
            token.freeMint(1); // Try to reenter with a different token ID
        }
        return this.onERC1155Received.selector;
    }
}