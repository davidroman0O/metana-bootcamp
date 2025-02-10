// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/forge.sol"; // Adjust the path to your contract

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        Forge token = new Forge();
        vm.stopBroadcast();
        console.log("Contract deployed at:", address(token));
    }
}
