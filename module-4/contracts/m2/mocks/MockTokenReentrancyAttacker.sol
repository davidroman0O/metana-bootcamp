// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {StakingVisageToken} from "../03-Staking.sol";

contract MockTokenReentrancyAttacker {
    StakingVisageToken public token;
    bool public attacking;

    constructor(address _token) {
        token = StakingVisageToken(payable(_token));
    }

    // Attempt to reenter during mintToken
    receive() external payable {
        if (attacking) {
            attacking = false;
            token.mintToken(address(this), 1000 * 1e18);
        }
    }

    function attack() external {
        attacking = true;
        token.mintToken(address(this), 1000 * 1e18);
    }

    function acceptTokenOwnership() external {
        token.acceptOwnership();
    }
}