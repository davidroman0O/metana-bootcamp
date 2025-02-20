// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../erc1155.sol";
import "../forge.sol";

contract MockOverrideBatchBurnReentrancyForgeAttack is ERC1155Token {
    address public forgeAddress;

    constructor(address payable initialOwner)
        ERC1155Token(payable(initialOwner))
    {}

    function setForgeAddress(address payable _forgeAddress) external {
        forgeAddress = _forgeAddress;
    }

    // Override batchBurn to trigger a reentrant call.
    function batchBurn(
        address account,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) public override {
        // Trigger a reentrant call to Forge.forge(...)
        if (forgeAddress != address(0)) {
            Forge(payable(forgeAddress)).forge(3);
        }
        // Use super to call the parent contract's implementation.
        super.batchBurn(account, ids, amounts);
    }
}
