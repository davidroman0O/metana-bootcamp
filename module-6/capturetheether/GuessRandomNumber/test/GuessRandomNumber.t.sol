// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/GuessRandomNumber.sol";

contract GuessRandomNumberTest is Test {
    GuessRandomNumber public guessRandomNumber;

    function testAnswer(uint256 blockNumber, uint256 blockTimestamp) public {
        // Prevent zero inputs
        vm.assume(blockNumber != 0);
        vm.assume(blockTimestamp != 0);
        
        // Set block number and timestamp before contract deployment
        // This will change the answer value since it depends on these
        vm.roll(blockNumber);
        vm.warp(blockTimestamp);
        
        // Let's redeploy it to be safe:
        vm.deal(address(this), 2 ether); // Refund test contract
        guessRandomNumber = new GuessRandomNumber{value: 1 ether}();
        
        // Get the address of the deployed challenge
        address challengeAddress = address(guessRandomNumber);
        
        // Read the answer directly from storage
        bytes32 slot0 = vm.load(challengeAddress, bytes32(uint256(0)));
        uint8 answer = uint8(uint256(slot0));
        
        console.log("Retrieved answer from storage:", answer);
        
        // Call the guess function with the correct answer
        guessRandomNumber.guess{value: 1 ether}(answer);
        
        console.log("Answer: ", answer);

        _checkSolved();
    }

    function _checkSolved() internal {
        assertTrue(guessRandomNumber.isComplete(), "Wrong Number");
    }

    receive() external payable {}
}