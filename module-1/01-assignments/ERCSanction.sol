// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ERCGod } from "./ERCGod.sol"; // mean that you have to create the other contract ERCGod.sol in the same directory

// Found in the ERC20.sol that _update is used by `transfer` and `transferFrom` 
contract ERCSanction is ERCGod{

    constructor(address initialOwner, string memory name_, string memory symbol_)
        ERCGod(initialOwner, name_, symbol_)
    {}

    event Sanctioned(address indexed account);
    event Unsanctioned(address indexed account);

    mapping(address => bool) _blacklisted;

    function sanction(address _target) public onlyOwner {
        _blacklisted[_target] = true;
        emit Sanctioned(_target);
    }

    function unsanction(address _target) public onlyOwner {
        _blacklisted[_target] = false;
        emit Unsanctioned(_target);
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

    // Transfer while preventing the sender and receiver if one is sanctioned
    function transfer(address to, uint256 value) public override onlyCleared(msg.sender) onlyCleared(to) returns (bool)  {
        return super.transfer(to, value);
    }

    // Transfer while preventing the sender and receiver if one is sanctioned
    function transferFrom(address from, address to, uint256 value) public override onlyCleared(from) onlyCleared(to) returns (bool) {
        return super.transferFrom(from, to, value);
    }

}
