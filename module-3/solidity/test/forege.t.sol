// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Forge} from "../src/forge.sol";
import {ERC1155Token} from "../src/erc1155.sol";

contract ForgeTest is Test {

    address addressMain = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    address addressSecond = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);

    function test_MintFree() public {     
        
        vm.startPrank(addressMain);
        ERC1155Token _erc1155 = new ERC1155Token("");
        vm.stopPrank();

        vm.startPrank(addressMain);

        vm.warp(block.timestamp + 1 minutes);
        _erc1155.freeMint(0);

        vm.warp(block.timestamp + 1 minutes);
        _erc1155.freeMint(1);

        vm.warp(block.timestamp + 1 minutes);
        _erc1155.freeMint(2);
        
        vm.warp(block.timestamp + 1 minutes);
        try  _erc1155.freeMint(3) {
            revert("Should not be able to mint token 3");
        } catch {
            // expected
        }
        vm.stopPrank();


        vm.startPrank(addressSecond);

        _erc1155.freeMint(0);
        vm.warp(block.timestamp + 1 minutes);      

        vm.stopPrank();
    }

    function test_Forge() public {
        Forge _forge = new Forge();
        ERC1155Token  _erc1155 = ERC1155Token(_forge.getAddress());

        vm.warp(block.timestamp + 1 minutes);
        vm.startPrank(addressMain);

        vm.warp(block.timestamp + 1 minutes);
        _erc1155.freeMint(0);

        vm.warp(block.timestamp + 1 minutes);
        _erc1155.freeMint(1);

        vm.warp(block.timestamp + 1 minutes);
        _erc1155.freeMint(2);

        _erc1155.setApprovalForAll(address(_forge), true);

        _forge.forge(3);

        console.log(_erc1155.balanceOf(addressMain, 0));
        console.log(_erc1155.balanceOf(addressMain, 1));
        console.log(_erc1155.balanceOf(addressMain, 2));

        vm.stopPrank();
    }

}
