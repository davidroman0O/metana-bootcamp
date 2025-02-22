// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWithdrawVictim {
    function withdraw() external;
    function acceptOwnership() external;
}

// Generic contract to attack a contract that has a withdraw function and test it's reentrancy protection
contract MockWithdrawReentrancyAttacker {
    IWithdrawVictim public victim;
    bool public attacking;

    constructor(address _victim) {
        victim = IWithdrawVictim(_victim);
    }

    // supposedly the victim got an Ownable2Step contract on it
    // since we're mostly using that one everywhere...
    function acceptOwnership() external {
        victim.acceptOwnership();
    }

    // Fallback function to receive ETH and attempt reentrancy
    receive() external payable {
        if (attacking) {
            attacking = false;
            victim.withdraw();
        }
    }

    function attack() external {
        attacking = true;
        victim.withdraw();
    }
}
