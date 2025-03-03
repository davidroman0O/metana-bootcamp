// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../src/PredictTheBlockhash.sol";

contract PredictTheBlockhashTest is Test {
    PredictTheBlockhash public predictTheBlockhash;
    ExploitContract public exploitContract;

    function setUp() public {
        // Deploy contracts
        predictTheBlockhash = (new PredictTheBlockhash){value: 1 ether}();
        exploitContract = new ExploitContract(predictTheBlockhash);
        vm.deal(address(exploitContract), 1 ether);
    }

    function testExploit() public {
        uint256 blockNumber = block.number;
        exploitContract.attack1();
        // the blockhash() function returns 0 (bytes32(0)) for any block number older than the last 256 blocks
        // since this block is now more than 256 blocks in the past, blockhash(settlementBlockNumber) will return 0
        // this matches our guessed value of bytes32(0)
        vm.roll(blockNumber + 256+2);
        exploitContract.attack2();
        // contract assumes that block hashes can always be retrieved, but in Ethereum, you can only access the last 256 block hashes

        _checkSolved();
    }

    function _checkSolved() internal {
        assertTrue(predictTheBlockhash.isComplete(), "Challenge Incomplete");
    }

    receive() external payable {}
}
