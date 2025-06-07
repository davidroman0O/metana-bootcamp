// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./DegenSlots.sol";

/**
 * @title DegenSlotsTest - Testing contract that inherits from DegenSlots
 * @dev This contract adds testing and mocking functions for development/testing  
 * @notice This contract should NEVER be deployed to production networks
 */
contract DegenSlotsTest is DegenSlots {
    
    // Testing variables
    uint256 public testETHPriceUSD; // Mock ETH price for testing (in cents)
    
    // Mock Compound state for testing
    mapping(address => uint256) public mockCEthBalances;
    mapping(address => uint256) public mockAccountLiquidity;
    mapping(address => bool) public mockMarketsEntered;
    uint256 public mockMintResult; // 0 = success, non-zero = error
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() DegenSlots() {
        // Test contract - inherits from DegenSlots properly
        // Uses upgrades.deployProxy() for testing like your NFT examples
    }
    
    /**
     * @dev Testing function to simulate VRF callback - only for development/testing
     * @param requestId The VRF request ID
     * @param randomWords Array of random numbers
     * @notice This function should only exist in test deployments
     */
    function testFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external override onlyOwner {
        // Only allow on testnets (not mainnet chainId 1)
        require(block.chainid != 1, "Testing function disabled on mainnet");
        
        // Implement VRF callback logic directly for testing
        Spin storage spin = spins[requestId];
        require(spin.player != address(0), "Invalid request ID");
        require(!spin.settled, "Spin already settled");
        
        // Generate reels from randomness
        uint256[] memory reels = _generateReels(randomWords[0], spin.reelCount);
        
        // Calculate payout using external tables
        (PayoutType payoutType, uint256 payout) = _calculateModeBasedPayout(spin.reelCount, reels, spin.betAmount);
        
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
            if (payoutType == PayoutType.JACKPOT) {
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
    
    // ============ COMPOUND MOCKING FUNCTIONS ============
    
    /**
     * @dev Mock cEth.mint() function for testing
     */
    function mockSetMintResult(uint256 result) external onlyOwner {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        mockMintResult = result;
    }
    
    /**
     * @dev Mock cEth.balanceOf() for testing
     */
    function mockSetCEthBalance(address account, uint256 balance) external onlyOwner {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        mockCEthBalances[account] = balance;
    }
    
    /**
     * @dev Mock comptroller.getAccountLiquidity() for testing
     */
    function mockSetAccountLiquidity(address account, uint256 liquidity) external onlyOwner {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        mockAccountLiquidity[account] = liquidity;
    }
    
    /**
     * @dev Mock comptroller.enterMarkets() for testing
     */
    function mockSetMarketEntered(address account, bool entered) external onlyOwner {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        mockMarketsEntered[account] = entered;
    }
    
    /**
     * @dev Override depositCollateral to use mocks in testing
     */
    function depositCollateral() external payable override nonReentrant {
        require(msg.value > 0, "Must deposit ETH");
        
        if (block.chainid != 1) {
            // Testing mode - use mocks
            mockMarketsEntered[msg.sender] = true;
            mockCEthBalances[msg.sender] += msg.value; // 1:1 for simplicity
            mockAccountLiquidity[msg.sender] += msg.value * 75 / 100; // 75% collateral factor
            
            emit CollateralDeposited(msg.sender, msg.value, mockCEthBalances[msg.sender]);
        } else {
            // Production mode - implement Compound logic directly
            address[] memory markets = new address[](1);
            markets[0] = address(cEth);
            comptroller.enterMarkets(markets);
            
            uint256 mintResult = cEth.mint{value: msg.value}();
            require(mintResult == 0, "cEth mint failed");
            
            emit CollateralDeposited(msg.sender, msg.value, cEth.balanceOf(msg.sender));
        }
    }
    
    /**
     * @dev Override borrowChips to use mocks in testing
     */
    function borrowChips(uint256 ethAmount) external override nonReentrant {
        require(ethAmount > 0, "Must borrow positive amount");
        
        if (block.chainid != 1) {
            // Testing mode - use mocks
            require(mockAccountLiquidity[msg.sender] >= ethAmount, "Insufficient collateral");
            
            // Calculate CHIPS amount based on ETH price
            uint256 chipsAmount = calculateChipsFromETH(ethAmount);
            
            // Debug: log the calculations
            uint256 contractBalance = chipToken.balanceOf(address(this));
            // Note: We can't use console.log in Solidity, but we can use events for debugging
            
            require(contractBalance >= chipsAmount, "Insufficient CHIPS in contract");
            
            // Track the borrowed amount
            borrowedETH[msg.sender] += ethAmount;
            
            // Reduce available liquidity
            mockAccountLiquidity[msg.sender] -= ethAmount;
            
            // Transfer CHIPS to borrower
            require(chipToken.transfer(msg.sender, chipsAmount), "CHIPS transfer failed");
            
            emit ChipsBorrowed(msg.sender, ethAmount, chipsAmount);
        } else {
            // Production mode - implement Compound logic directly
            (, uint256 liquidity, ) = comptroller.getAccountLiquidity(msg.sender);
            require(liquidity >= ethAmount, "Insufficient collateral");
            
            uint256 chipsAmount = calculateChipsFromETH(ethAmount);
            require(chipToken.balanceOf(address(this)) >= chipsAmount, "Insufficient CHIPS in contract");
            
            borrowedETH[msg.sender] += ethAmount;
            require(chipToken.transfer(msg.sender, chipsAmount), "CHIPS transfer failed");
            
            emit ChipsBorrowed(msg.sender, ethAmount, chipsAmount);
        }
    }
    
    /**
     * @dev Override repayLoanWithETH to use mocks in testing
     */
    function repayLoanWithETH() external payable override nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(borrowedETH[msg.sender] > 0, "No outstanding loan");
        require(msg.value <= borrowedETH[msg.sender], "Repayment exceeds loan");
        
        if (block.chainid != 1) {
            // Testing mode - use mocks
            borrowedETH[msg.sender] -= msg.value;
            mockAccountLiquidity[msg.sender] += msg.value; // Restore liquidity
            
            emit ETHRepayment(msg.sender, msg.value);
        } else {
            // Production mode - implement logic directly
            borrowedETH[msg.sender] -= msg.value;
            emit ETHRepayment(msg.sender, msg.value);
        }
    }
    
    /**
     * @dev Override getAccountLiquidity to use mocks in testing
     */
    function getAccountLiquidity(address account) external view override returns (uint256) {
        if (block.chainid != 1) {
            // Testing mode - return mock liquidity
            return mockAccountLiquidity[account];
        } else {
            // Production mode - use real Compound
            (, uint256 liquidity, ) = comptroller.getAccountLiquidity(account);
            return liquidity;
        }
    }
    
    /**
     * @dev Override getPlayerStats to use mocks in testing
     */
    function getPlayerStats(address player) external view override returns (
        uint256 balance,
        uint256 winnings,
        uint256 spinsCount,
        uint256 totalWinnings,
        uint256 borrowedAmount,
        uint256 accountLiquidity
    ) {
        uint256 liquidity;
        if (block.chainid != 1) {
            // Testing mode - use mock liquidity
            liquidity = mockAccountLiquidity[player];
        } else {
            // Production mode - use real Compound
            (, liquidity, ) = comptroller.getAccountLiquidity(player);
        }
        
        return (
            chipToken.balanceOf(player),
            playerWinnings[player],
            totalSpins[player],
            totalWon[player],
            borrowedETH[player],
            liquidity
        );
    }
    
    /**
     * @dev Get mock cEth balance for testing
     */
    function getMockCEthBalance(address account) external view returns (uint256) {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        return mockCEthBalances[account];
    }
    
    /**
     * @dev Get mock account liquidity for testing
     */
    function getMockAccountLiquidity(address account) external view returns (uint256) {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        return mockAccountLiquidity[account];
    }
    
    /**
     * @dev Check if account has entered markets for testing
     */
    function getMockMarketEntered(address account) external view returns (bool) {
        require(block.chainid != 1, "Testing function disabled on mainnet");
        return mockMarketsEntered[account];
    }
} 