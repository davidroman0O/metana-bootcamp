// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockTarget
 * @dev Mock contract for testing governance execution
 */
contract MockTarget {
    uint256 public value;
    mapping(address => uint256) public balances;
    
    event ValueChanged(uint256 oldValue, uint256 newValue);
    event Deposit(address indexed from, uint256 amount);
    
    error AlwaysFails();
    
    /**
     * @dev Function that always succeeds
     */
    function setValue(uint256 _value) external {
        uint256 oldValue = value;
        value = _value;
        emit ValueChanged(oldValue, _value);
    }
    
    /**
     * @dev Function that always fails
     */
    function failingFunction() external pure {
        revert AlwaysFails();
    }
    
    /**
     * @dev Payable function for testing
     */
    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}