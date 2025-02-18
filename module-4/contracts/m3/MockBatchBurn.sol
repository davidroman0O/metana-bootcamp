// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./erc1155.sol";

contract MockBatch {
    ERC1155Token private token;

    constructor(address _token) {
        token = ERC1155Token(payable(_token));
    }

    function triggerBatchBurn(address account, uint256[] calldata ids, uint256[] calldata amounts) external {
        token.batchBurn(account, ids, amounts);
    }

    function forgeMint(address account, uint256 id, uint256 amount) external {
        token.forgeMint(account, id, amount);
    }

    function acceptTokenOwnership() external {
        token.acceptOwnership();
    }
}
