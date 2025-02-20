// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERCRefund} from "../ERCRefund.sol";

contract MockRefundFailSellBackTransferAttacker is ERCRefund {
    // Override transfer to always return false
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        return false;
    }
}

