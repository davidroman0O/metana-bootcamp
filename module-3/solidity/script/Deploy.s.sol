// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/forge.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        new Forge();
        vm.stopBroadcast();
    }
}
