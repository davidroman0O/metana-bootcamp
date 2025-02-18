// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERCRefund} from "../ERCRefund.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockMaliciousReceiver is Ownable {
    ERCRefund public ercRefund;
    bool public shouldReject;

    constructor(address _ercRefund) Ownable(msg.sender) {
        ercRefund = ERCRefund(payable(_ercRefund));
    }

    function setReject(bool _shouldReject) external onlyOwner {
        shouldReject = _shouldReject;
    }

    // Accept ownership of the ERCRefund contract
    function acceptRefundOwnership() external onlyOwner {
        ercRefund.acceptOwnership();
    }

    // This function will be called when attempting to withdraw
    receive() external payable {
        if (shouldReject) {
            revert("Rejecting ETH transfer");
        }
    }

    function withdrawFromRefund() external onlyOwner {
        ercRefund.withdraw();
    }
}