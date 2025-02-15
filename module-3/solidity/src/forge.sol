// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the token contract interface.
import "./erc1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Forge
 * @notice Implements forging (burning and minting) and trading functions.
 */
contract Forge is Ownable(msg.sender) {

    /// @notice The ERC1155 token contract.
    ERC1155Token private token;

    event TokenForged(address indexed creator, uint256 tokenId);
    event TokenTraded(address indexed trader, uint256 fromToken, uint256 toToken);
    
    constructor() {
        token = new ERC1155Token();
    }

    function getAddress() external view returns (address) {
        return address(token);
    }
    
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

        emit TokenForged(msg.sender, forgedTokenId);
    }
    
    function trade(uint256 tokenIdToTrade, uint256 desiredBaseTokenId) external {
        require(desiredBaseTokenId < 3, "Can only trade for base tokens (0-2)");
        require(tokenIdToTrade < 7, "Token id to trade must be between 0 and 6");
        require(tokenIdToTrade != desiredBaseTokenId, "Cannot trade token for itself");
        
        // Burn the token provided by the user.
        token.burn(msg.sender, tokenIdToTrade, 1);
        
        // Only mint a new token if they traded in a base token (0-1-2)
        if (tokenIdToTrade < 3) {
            token.forgeMint(msg.sender, desiredBaseTokenId, 1);
        }

        emit TokenTraded(msg.sender, tokenIdToTrade, desiredBaseTokenId);
    }
}
