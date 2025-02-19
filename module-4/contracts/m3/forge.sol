// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the token contract interface.
import "./erc1155.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Forge
 * @notice Implements forging (burning and minting) and trading functions.
 */
contract Forge is Ownable2Step, ReentrancyGuard {

    /// @notice The ERC1155 token contract.
    ERC1155Token private immutable token;

    event TokenForged(address indexed creator, uint256 tokenId);
    event TokenTraded(address indexed trader, uint256 fromToken, uint256 toToken);
    
    fallback() external payable {
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        revert("You can't send ether on that contract");
    }

    constructor(address initialOwner, address _token) Ownable(initialOwner) {
        token = ERC1155Token(payable(_token)); // explicitly having the contract address
    }

    function acceptTokenOwnership() external onlyOwner {
        token.acceptOwnership();
    }
    
    function forge(uint256 forgedTokenId) external nonReentrant() {        
        // Now that i know about Check-Effects-Interactions pattern, I will first burn the tokens differently.
        uint256[] memory ids; // false-positive because init later one
        uint256[] memory amounts; // false-positive because init later one
        
        if (forgedTokenId == 3) {
            // Forge token 3 by burning one token 0 and one token 1.
            ids = new uint256[](2);
            amounts = new uint256[](2);
            ids[0] = 0; amounts[0] = 1;
            ids[1] = 1; amounts[1] = 1;
        } else if (forgedTokenId == 4) {
            // Forge token 4 by burning one token 1 and one token 2.
            ids = new uint256[](2);
            amounts = new uint256[](2);
            ids[0] = 1; amounts[0] = 1;
            ids[1] = 2; amounts[1] = 1;
        } else if (forgedTokenId == 5) {
            // Forge token 5 by burning one token 0 and one token 2.
            ids = new uint256[](2);
            amounts = new uint256[](2);
            ids[0] = 0; amounts[0] = 1;
            ids[1] = 2; amounts[1] = 1;
        } else if (forgedTokenId == 6) {
            // Forge token 6 by burning one each of tokens 0, 1, and 2.
            ids = new uint256[](3);
            amounts = new uint256[](3);
            ids[0] = 0; amounts[0] = 1;
            ids[1] = 1; amounts[1] = 1;
            ids[2] = 2; amounts[2] = 1;
        } else {
            revert("Invalid forged token id"); // the only way to have an easy 100% coverage
        }

        // Slither also complained about the inside loop external call, so I will batchBurn the tokens.
        token.batchBurn(msg.sender, ids, amounts);
        
        // Mint the forged token to the caller.
        token.forgeMint(msg.sender, forgedTokenId, 1);

        emit TokenForged(msg.sender, forgedTokenId);
    }
    
    function trade(uint256 tokenIdToTrade, uint256 desiredBaseTokenId) external {
        require(desiredBaseTokenId < 3, "Can only trade for base tokens (0-2)");
        require(tokenIdToTrade < 7, "Token id to trade must be between 0 and 6");
        require(tokenIdToTrade != desiredBaseTokenId, "Cannot trade token for itself");
        
        // Burn the token provided by the user.
        token.burn(msg.sender, tokenIdToTrade, 1);
        
        token.forgeMint(msg.sender, desiredBaseTokenId, 1);

        emit TokenTraded(msg.sender, tokenIdToTrade, desiredBaseTokenId);
    }

}
