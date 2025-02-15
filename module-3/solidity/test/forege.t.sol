// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Forge} from "../src/forge.sol";
import {ERC1155Token} from "../src/erc1155.sol";

contract ForgeTest is Test {
    address addressMain = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    address addressSecond = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);

    /// @notice Test that free mint works correctly for allowed base tokens.
    function test_FreeMint_Success() public {
        ERC1155Token token = new ERC1155Token();
        vm.startPrank(addressMain);

        // Move time forward enough for the first mint.
        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        assertEq(token.balanceOf(addressMain, 0), 1);

        vm.warp(block.timestamp + 60);
        token.freeMint(1);
        assertEq(token.balanceOf(addressMain, 1), 1);

        vm.warp(block.timestamp + 60);
        token.freeMint(2);
        assertEq(token.balanceOf(addressMain, 2), 1);

        vm.stopPrank();
    }

    /// @notice Test that trying to free mint a token outside 0-2 fails.
    function test_FreeMint_RevertsForInvalidId() public {
        ERC1155Token token = new ERC1155Token();
        vm.startPrank(addressMain);

        vm.warp(block.timestamp + 60);
        vm.expectRevert("Free mint only allowed for tokens 0-2");
        token.freeMint(3);
        vm.stopPrank();
    }

    /// @notice Test that free minting the same token twice reverts.
    function test_FreeMint_RevertsIfAlreadyMinted() public {
        ERC1155Token token = new ERC1155Token();
        vm.startPrank(addressMain);

        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        assertEq(token.balanceOf(addressMain, 0), 1);

        vm.warp(block.timestamp + 60);
        vm.expectRevert("was already minted");
        token.freeMint(0);

        vm.stopPrank();
    }

    /// @notice Test that the cooldown is enforced.
    function test_FreeMint_CooldownEnforced() public {
        ERC1155Token token = new ERC1155Token();
        vm.startPrank(addressMain);

        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        // Immediately try to mint token 1 without waiting – should revert due to cooldown.
        vm.expectRevert("Cooldown active: wait 1 minute between mints");
        token.freeMint(1);
        vm.stopPrank();
    }

    /// @notice Test forging token 3 by burning tokens 0 and 1.
    function test_ForgeToken3_Success() public {
        Forge forgeContract = new Forge();
        ERC1155Token token = ERC1155Token(forgeContract.getAddress());

        vm.startPrank(addressMain);

        // Mint all three base tokens.
        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        vm.warp(block.timestamp + 60);
        token.freeMint(1);
        vm.warp(block.timestamp + 60);
        token.freeMint(2);

        // Approve the Forge contract to move tokens on our behalf.
        token.setApprovalForAll(address(forgeContract), true);

        // Forge token 3 (which burns tokens 0 and 1).
        forgeContract.forge(3);

        // Check that tokens 0 and 1 are burned and token 3 is minted.
        assertEq(token.balanceOf(addressMain, 0), 0);
        assertEq(token.balanceOf(addressMain, 1), 0);
        assertEq(token.balanceOf(addressMain, 2), 1);  // not used for forging token 3.
        assertEq(token.balanceOf(addressMain, 3), 1);

        vm.stopPrank();
    }

    /// @notice Test that forging fails if required base tokens are missing.
    function test_ForgeFailsWithoutRequiredTokens() public {
        Forge forgeContract = new Forge();
        ERC1155Token token = ERC1155Token(forgeContract.getAddress());

        vm.startPrank(addressMain);

        // Only mint token 0 and token 2.
        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        vm.warp(block.timestamp + 60);
        token.freeMint(2);

        token.setApprovalForAll(address(forgeContract), true);

        // Attempt to forge token 3 (requires tokens 0 and 1); should revert because token 1 is missing.
        vm.expectRevert();
        forgeContract.forge(3);

        vm.stopPrank();
    }

    /// @notice Test trading base token for another base token
    function test_TradeBaseToken_Success() public {
        Forge forgeContract = new Forge();
        ERC1155Token token = ERC1155Token(forgeContract.getAddress());

        vm.startPrank(addressMain);

        // Mint a base token
        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        token.setApprovalForAll(address(forgeContract), true);

        // Trade token 0 for token 1
        forgeContract.trade(0, 1);

        // After trading, token 0 should be burned and token 1 should be received
        assertEq(token.balanceOf(addressMain, 0), 0);
        assertEq(token.balanceOf(addressMain, 1), 1);

        vm.stopPrank();
    }

    /// @notice Test trading higher tier token (3-6) results in burn only
    function test_TradeHigherTierToken_OnlyBurns() public {
        Forge forgeContract = new Forge();
        ERC1155Token token = ERC1155Token(forgeContract.getAddress());

        vm.startPrank(addressMain);

        // Mint base tokens and forge token 3
        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        vm.warp(block.timestamp + 60);
        token.freeMint(1);
        token.setApprovalForAll(address(forgeContract), true);
        forgeContract.forge(3);
        assertEq(token.balanceOf(addressMain, 3), 1);

        // Trade token 3 for base token 0
        forgeContract.trade(3, 0);

        // After trading, token 3 should be burned but no token 0 should be received
        assertEq(token.balanceOf(addressMain, 3), 0);
        assertEq(token.balanceOf(addressMain, 0), 0);

        vm.stopPrank();
    }

    /// @notice Test that trading fails when the desired token is not a base token.
    function test_Trade_RevertsForNonBaseDesiredToken() public {
        Forge forgeContract = new Forge();
        ERC1155Token token = ERC1155Token(forgeContract.getAddress());

        vm.startPrank(addressMain);

        // Mint a base token.
        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        token.setApprovalForAll(address(forgeContract), true);

        // Attempt to trade token 0 for token 3 (which is not a base token, allowed IDs are 0-2).
        vm.expectRevert("Can only trade for base tokens (0-2)");
        forgeContract.trade(0, 3);

        vm.stopPrank();
    }

    /// @notice Test that trading the same token for itself fails
    function test_Trade_RevertsForSameToken() public {
        Forge forgeContract = new Forge();
        ERC1155Token token = ERC1155Token(forgeContract.getAddress());

        vm.startPrank(addressMain);

        // Mint a base token
        vm.warp(block.timestamp + 60);
        token.freeMint(0);
        token.setApprovalForAll(address(forgeContract), true);

        // Attempt to trade token 0 for token 0
        vm.expectRevert("Cannot trade token for itself");
        forgeContract.trade(0, 0);

        vm.stopPrank();
    }
}