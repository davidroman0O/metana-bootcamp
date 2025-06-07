// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ChipToken
 * @dev Upgradeable ERC20 token representing casino chips pegged to USD value
 */
contract ChipToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18; // 1 billion tokens max
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address initialOwner) external initializer {
        __ERC20_init("Casino Chips", "CHIP");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    /**
     * @dev Mint new chips - only callable by the DegenSlots contract
     * @param to Address to mint chips to
     * @param amount Amount of chips to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be positive");
        
        _mint(to, amount);
    }
    
    /**
     * @dev Burn chips - only callable by the DegenSlots contract
     * @param from Address to burn chips from
     * @param amount Amount of chips to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be positive");
        
        _burn(from, amount);
    }
    
    /**
     * @dev Override decimals to use 18 decimals for precision
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    /**
     * @dev Required by UUPSUpgradeable - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
} 