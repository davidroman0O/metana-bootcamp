// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERCRefund} from "../ERCRefund.sol";

contract MockRefundSellbackReentrancyAttacker {
    ERCRefund public ercRefund;
    bool public attacking;

    constructor(address _ercRefund) {
        ercRefund = ERCRefund(payable(_ercRefund));
    }

    // Fallback function to receive ETH
    receive() external payable {
        if (attacking) {
            attacking = false;
            // Try to reenter
            ercRefund.sellBack(1000 * 1e18);
        }
    }

    function attack() external {
        attacking = true;
        ercRefund.sellBack(1000 * 1e18);
    }
}