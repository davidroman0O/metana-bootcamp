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
            // Try to reenter with a minimal amount of ETH
            token.mint{value: 1 wei}(address(this));
        }
    }

    function attack() external payable {
        require(msg.value > 0, "Send ETH to attack");
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

    function onTokenUpdate(uint256 amount) external {
        if (attacking) {
            attacking = false;
            // Try to reenter mintToken during the _update callback
            token.mintToken(address(this), amount);
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