// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/* solhint-disable comprehensive-interface */

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title GovernanceToken
 * @dev ERC20 token with voting capabilities and security features
 * 
 * Security features:
 * - ERC20Votes for governance (built-in flash loan protection)
 * - Supply cap to prevent inflation attacks
 * - Access control for minting operations
 * - Emergency pause functionality
 */
contract GovernanceToken is 
    ERC20, 
    ERC20Burnable,
    ERC20Votes,
    ERC20Permit, 
    AccessControl,
    Pausable
{
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Constants
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M tokens
    
    // State variables
    uint256 public totalMinted;
    
    // Events
    event EmergencyPause(address indexed caller);
    event EmergencyUnpause(address indexed caller);
    
    // Errors
    error MaxSupplyExceeded();
    error TransferToZeroAddress();
    error InvalidAmount();
    
    constructor(address admin) 
        ERC20("DAO Token", "DAO") 
        ERC20Permit("DAO Token") 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }
    
    /**
     * @dev Mint new tokens with supply cap check
     * @param to Address to receive tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        if (to == address(0)) revert TransferToZeroAddress();
        if (amount == 0) revert InvalidAmount();
        
        uint256 newTotalMinted = totalMinted + amount;
        if (newTotalMinted > MAX_SUPPLY) revert MaxSupplyExceeded();
        
        totalMinted = newTotalMinted;
        _mint(to, amount);
    }
    
    /**
     * @dev Override _update to add pause check
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) whenNotPaused {
        super._update(from, to, value);
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender);
    }
    
    /**
     * @dev Emergency unpause
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }
    
    // Add explicit nonces override to resolve multiple inheritance
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
    
}