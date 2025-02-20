// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExchangeVisageToken} from "../02-Exchange.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RejectETH is Ownable {

    ExchangeVisageToken victim;

    constructor(address _victim) Ownable(msg.sender) {
        victim = ExchangeVisageToken(payable(_victim));
    }

    // This function catches calls with data or without data
    fallback() external payable {
        revert("rejecting ETH");
    }
    
    // This function catches plain ETH transfers
    receive() external payable {
        revert("rejecting ETH");
    }

    function withdraw() external onlyOwner {
        victim.withdraw();
    }

    function acceptOwnership() external onlyOwner {
        victim.acceptOwnership();
    }
}
