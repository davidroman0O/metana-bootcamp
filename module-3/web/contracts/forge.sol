// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the token contract interface.
import "./MyERC1155Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Forge
 * @notice Implements forging (burning and minting) and trading functions.
 */
contract Forge is Ownable() {
    /// @notice The ERC1155 token contract.
    MyERC1155Token public token;
    
    /**
     * @notice Constructor sets the token contract address.
     * @param _token The deployed ERC1155 token contract.
     */
    constructor() {
        token = new MyERC1155Token();
    }
    
    /**
     * @notice Forge a new token by burning the required base tokens.
     * @dev The caller must have approved this contract to burn tokens on their behalf.
     * @param forgedTokenId The token id to forge (must be 3, 4, 5, or 6).
     */
    function forge(uint256 forgedTokenId) external {
        require(forgedTokenId >= 3 && forgedTokenId <= 6, "Can only forge tokens 3-6");
        
        if (forgedTokenId == 3) {
            // Forge token 3 by burning one token 0 and one token 1.
            token.burn(msg.sender, 0, 1);
            token.burn(msg.sender, 1, 1);
        } else if (forgedTokenId == 4) {
            // Forge token 4 by burning one token 1 and one token 2.
            token.burn(msg.sender, 1, 1);
            token.burn(msg.sender, 2, 1);
        } else if (forgedTokenId == 5) {
            // Forge token 5 by burning one token 0 and one token 2.
            token.burn(msg.sender, 0, 1);
            token.burn(msg.sender, 2, 1);
        } else if (forgedTokenId == 6) {
            // Forge token 6 by burning one each of tokens 0, 1, and 2.
            token.burn(msg.sender, 0, 1);
            token.burn(msg.sender, 1, 1);
            token.burn(msg.sender, 2, 1);
        }
        
        // Mint the forged token to the caller.
        token.forgeMint(msg.sender, forgedTokenId, 1);
    }
    
    /**
     * @notice Trade any token for one of the base tokens (0, 1, or 2).
     * @dev The caller must have approved this contract to burn tokens on their behalf.
     * @param tokenIdToTrade The token id the caller wants to trade (can be 0–6).
     * @param desiredBaseTokenId The base token id to receive (must be 0, 1, or 2).
     */
    function trade(uint256 tokenIdToTrade, uint256 desiredBaseTokenId) external {
        require(desiredBaseTokenId < 3, "Can only trade for base tokens (0-2)");
        require(tokenIdToTrade < 7, "Token id to trade must be between 0 and 6");
        
        // Burn the token provided by the user.
        token.burn(msg.sender, tokenIdToTrade, 1);
        
        // Mint the desired base token.
        token.forgeMint(msg.sender, desiredBaseTokenId, 1);
    }
}
