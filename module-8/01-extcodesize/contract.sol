// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Address.sol";

// Main contract to demonstrate security checks
contract SecurityDemo {
    using Address for address;
    
    // Results of our tests
    bool public extcodesizeBypassedInConstructor;
    bool public txOriginBlockedConstructorCall;
    
    // Events to log test results
    event ExtcodesizeTest(address caller, bool wasDetectedAsContract, uint256 codeSize);
    event TxOriginTest(address msgSender, address txOrigin, bool wasDetectedAsContract);
    
    // Function to run the demonstration
    function runDemo() external {
        // Reset results
        extcodesizeBypassedInConstructor = false;
        txOriginBlockedConstructorCall = false;
        
        // Deploy the attacker contract
        new ConstructorAttacker(address(this));
        
        // After tests are complete, check the state variables to see results
        emit ExtcodesizeTest(address(0), extcodesizeBypassedInConstructor, 0);
        emit TxOriginTest(address(0), address(0), txOriginBlockedConstructorCall);
    }
    
    // Test if code size check can detect a contract in its constructor
    function testExtcodesize() external {
        // Check code size of the caller
        uint256 codeSize = address(msg.sender).code.length;
        bool hasNoCode = (codeSize == 0);
        
        // Log the results
        emit ExtcodesizeTest(msg.sender, !hasNoCode, codeSize);
        
        // If we get here and hasNoCode is true, 
        // it means extcodesize failed to detect the contract
        extcodesizeBypassedInConstructor = hasNoCode;
    }
    
    // Test if tx.origin can detect a contract in its constructor
    function testTxOrigin() external {
        // Check if the caller is an EOA
        bool isEOA = (msg.sender == tx.origin);
        
        // Log the results
        emit TxOriginTest(msg.sender, tx.origin, !isEOA);
        
        // If we get here and isEOA is false,
        // it means tx.origin correctly identified a contract call
        txOriginBlockedConstructorCall = !isEOA;
    }
}

// Contract that tests both protections from its constructor
contract ConstructorAttacker {
    using Address for address;
    
    // Event to signal constructor execution
    event AttackerDeployed(address target);
    
    constructor(address target) {
        // Log that we're deploying
        emit AttackerDeployed(target);
        
        SecurityDemo demo = SecurityDemo(target);
        
        // Test both protections from the constructor
        demo.testExtcodesize();
        demo.testTxOrigin();
    }
}

/*

We should have something like that

[
	{
		"from": "0xD82FF30677c5233Ebe94e24D53D3f5c754Ec3F5F",
		"topic": "0xf5984ddf66f99e4d50dcb1f619388b8d3b34ab8573a77e3b2a14e16668bf3b13",
		"event": "AttackerDeployed",
		"args": {
			"0": "0x62BB62dDBCACC218E2b2d2f7AF3962DAa1F8212e",
			"target": "0x62BB62dDBCACC218E2b2d2f7AF3962DAa1F8212e"
		}
	},
	{
		"from": "0x62BB62dDBCACC218E2b2d2f7AF3962DAa1F8212e",
		"topic": "0x00066485bdc3b3e3dad32f79ab432ec6293cd40b8239ef471f6712bbfc259544",
		"event": "ExtcodesizeTest",
		"args": {
			"0": "0xD82FF30677c5233Ebe94e24D53D3f5c754Ec3F5F",
			"1": false,
			"2": "0",
			"caller": "0xD82FF30677c5233Ebe94e24D53D3f5c754Ec3F5F",
			"wasDetectedAsContract": false,
			"codeSize": "0"
		}
	},

    Even though ConstructorAttacker is a contract, the code size check returned 0, failing to detect it as a contract!
    This proves that extcodesize checks can be bypassed during construction.

	{
		"from": "0x62BB62dDBCACC218E2b2d2f7AF3962DAa1F8212e",
		"topic": "0x2c13876e8527bf55f358dfb1e69bb27e7acf54995b0d9835882e506d0b3fba3c",
		"event": "TxOriginTest",
		"args": {
			"0": "0xD82FF30677c5233Ebe94e24D53D3f5c754Ec3F5F",
			"1": "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
			"2": true,
			"msgSender": "0xD82FF30677c5233Ebe94e24D53D3f5c754Ec3F5F",
			"txOrigin": "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
			"wasDetectedAsContract": true
		}
	}

    The tx.origin check correctly identified this as a contract call, even during construction.
    This proves that msg.sender == tx.origin checks provide better protection.
]

This demonstration shows why checking msg.sender == tx.origin is more reliable than extcodesize for preventing malicious contract interactions.
While code size checks can be circumvented during contract construction, the tx.origin check is effective at all times.

*/