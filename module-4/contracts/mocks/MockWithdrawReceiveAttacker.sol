// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IWithdrawVictim {
    function withdraw() external;
    function acceptOwnership() external;
}

// Generic contract to attack a contract that has a withdraw function and test it's else path
contract MockWithdrawReceiveAttacker is Ownable {
    IWithdrawVictim public victim;
    bool public attacking;

    constructor(address _victim) Ownable(msg.sender) {
        victim = IWithdrawVictim(payable(_victim));
    }

    function acceptOwnership() external onlyOwner {
        victim.acceptOwnership();
    }

    // This function will be called when attempting to withdraw
    receive() external payable {
        if (attacking) {
            attacking = false;
            revert("Rejecting ETH transfer");
        }
    }

    function attack() external onlyOwner {
        attacking = true;
        victim.withdraw();
    }
}