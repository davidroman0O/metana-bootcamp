// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // slither version constraint

import { ERCGod } from "./ERCGod.sol"; // mean that you have to create the other contract ERCGod.sol in the same directory

// Found in the ERC20.sol that _update is used by `transfer` and `transferFrom` 
contract ERCSanction is ERCGod {

    constructor()
        ERCGod("Sanction", "SANC")
    {}

    event Sanctioned(address indexed account);
    event Unsanctioned(address indexed account);

    mapping(address => bool) _blacklisted;

    function sanction(address target) public onlyOwner { // slither no `_` on params "not in mixedCase"
        _blacklisted[target] = true;
        emit Sanctioned(target);
    }

    function unsanction(address target) public onlyOwner { // slither no `_` on params "not in mixedCase"
        _blacklisted[target] = false;
        emit Unsanctioned(target);
    }

    modifier onlyCleared(address account) {
        // one exception when it's the owner because the owner do the fuck it wants
        if (msg.sender == owner()) {
            _;
            return;
        }
        require(!_blacklisted[account], "sanctioned");
        _;
    }

    function _update(address from, address to, uint256 value) internal override onlyCleared(msg.sender) onlyCleared(to) {
        super._update(from, to, value);
    }

}