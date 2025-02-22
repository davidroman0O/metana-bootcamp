// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/forge.sol";
import "../src/erc1155.sol";

contract DeployScript is Script {
    function run() external {
        // Start broadcasting transactions
        vm.startBroadcast();

        // Step 1: Deploy the ERC1155Token contract
        // msg.sender will be the initial owner (the --sender address)
        ERC1155Token token = new ERC1155Token(msg.sender);
        console.log("ERC1155Token deployed at:", address(token));

        // Step 2: Deploy the Forge contract
        // Pass msg.sender as initial owner and the token address
        Forge forge = new Forge(msg.sender, address(token));
        console.log("Forge deployed at:", address(forge));

        // Step 3: Transfer ownership of the ERC1155Token to the Forge
        token.transferOwnership(address(forge));
        console.log("ERC1155Token ownership transferred to Forge");

        // Step 4: Accept the ownership in the Forge contract
        forge.acceptTokenOwnership();
        console.log("Forge accepted ERC1155Token ownership");

        vm.stopBroadcast();

        // Log final confirmation
        console.log("Deployment completed successfully");
        console.log("Token contract:", address(token));
        console.log("Forge contract:", address(forge));
    }
}