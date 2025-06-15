// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./CasinoSlot.sol";

/**
 * @title CasinoSlotTest - Testing contract that inherits from CasinoSlot
 * @dev This contract adds testing functions for development/testing  
 * @notice This contract should NEVER be deployed to production networks
 */
contract CasinoSlotTest is CasinoSlot {
    
    // Testing variables
    uint256 public testETHPriceUSD; // Mock ETH price for testing (in cents)
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() CasinoSlot() {
        // Test contract - inherits from CasinoSlot properly
        // Uses upgrades.deployProxy() for testing like your NFT examples
    }
    
    /**
     * @dev Testing function to simulate VRF callback - only for development/testing
     * @param requestId The VRF request ID
     * @param randomWords Array of random numbers
     * @notice This function should only exist in test deployments
     */
    function testFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external onlyOwner {
        // Only allow on testnets (not mainnet chainId 1)
        require(block.chainid != 1, "Testing function disabled on mainnet");
        
        // Implement VRF callback logic directly for testing
        Spin storage spin = spins[requestId];
        require(spin.player != address(0), "Invalid request ID");
        require(!spin.settled, "Spin already settled");
        
        // Generate reels from randomness
        uint256[] memory reels = _generateReels(randomWords[0], spin.reelCount);
        
        // Calculate payout using external tables
        (IPayoutTables.PayoutType payoutType, uint256 payout) = _calculateModeBasedPayout(spin.reelCount, reels, spin.betAmount);
        
        // Update spin data
        spin.reels = reels;
        spin.payoutType = payoutType;
        spin.payout = payout;
        spin.settled = true;
        
        // Award winnings if any
        if (payout > 0) {
            playerWinnings[spin.player] += payout;
            totalWon[spin.player] += payout;
            
            // For jackpot, reduce the prize pool
            if (payoutType == IPayoutTables.PayoutType.JACKPOT) {
                totalPrizePool -= payout;
            }
        }
        
        emit SpinResult(requestId, spin.player, spin.reelCount, reels, payoutType, payout);
    }
    
    /**
     * @dev Testing function to set mock ETH price - only for testing, only owner
     */
    function setTestETHPrice(uint256 priceInCents) external onlyOwner {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        testETHPriceUSD = priceInCents;
    }
    
    /**
     * @dev Mock getETHPrice function for testing (replaces real price feed functionality)
     */
    function getETHPrice() public view returns (uint256) {
        // Use mock price for testing if enabled
        if (testETHPriceUSD > 0) {
            return testETHPriceUSD;
        }
        
        // Fall back to real price feed
        (, int256 price, , , ) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        
        // Chainlink price feed has 8 decimals, convert to cents
        return uint256(price) / 1e6; // Convert from 8 decimals to cents
    }
    
    /**
     * @dev Get test mode status
     */
    function isTestContract() external pure returns (bool) {
        return true;
    }
    
    /**
     * @dev Add ETH to prize pool for testing
     */
    function addToPrizePool(uint256 amount) external onlyOwner {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        totalPrizePool += amount;
    }
} 