// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {StakingVisageToken} from "../staking.sol";

// For testing reentrancy on payable mint function
contract MockPayableMintReentrancyAttacker {
    StakingVisageToken public token;
    bool public attacking;

    constructor(address _token) {
        token = StakingVisageToken(payable(_token));
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            // Try to reenter the mint function
            token.mint{value: 1 ether}(address(this));
        }
    }

    function attack() external payable {
        attacking = true;
        token.mint{value: msg.value}(address(this));
    }
}

// For testing reentrancy on mintToken function
contract MockMintTokenReentrancyAttacker {
    StakingVisageToken public token;
    bool public attacking;

    constructor(address _token) {
        token = StakingVisageToken(payable(_token));
    }

    function acceptTokenOwnership() external {
        token.acceptOwnership();
    }

    function onMinted(uint256 amount) internal {
        if (attacking) {
            attacking = false;
            // Try to reenter mintToken
            token.mintToken(address(this), amount);
        }
    }

    function attack() external {
        attacking = true;
        token.mintToken(address(this), 1000 * 1e18);
    }
}