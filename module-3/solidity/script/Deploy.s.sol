// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/forge.sol";
import "../src/erc1155.sol"; 

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        Forge token = new Forge();
        address erc1155Address = token.getAddress();
        vm.stopBroadcast();

        console.log(
            string(
                abi.encodePacked(
                    '{"forge":"',
                    toAsciiString(address(token)),
                    '","erc1155":"',
                    toAsciiString(erc1155Address),
                    '"}'
                )
            )
        );
    }

    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
