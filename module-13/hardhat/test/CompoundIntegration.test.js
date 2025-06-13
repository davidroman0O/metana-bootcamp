const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🏦 Compound Integration - Leveraged Gambling", function () {
  let casinoSlot, payoutTables, payoutTables3, payoutTables4;
  let owner, player1, player2;
  
  // REAL Compound mainnet addresses - NO MOCKING
  const CETH_ADDRESS = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";
  const COMPTROLLER_ADDRESS = "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B";
  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef";

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();

    // Deploy PayoutTables contracts
    const PayoutTables3 = await ethers.getContractFactory("PayoutTables3");
    payoutTables3 = await PayoutTables3.deploy();
    await payoutTables3.deployed();

    const PayoutTables4 = await ethers.getContractFactory("PayoutTables4");
    payoutTables4 = await PayoutTables4.deploy();
    await payoutTables4.deployed();

    // Deploy main PayoutTables API
    const PayoutTables = await ethers.getContractFactory("PayoutTables");
    payoutTables = await PayoutTables.deploy(
      payoutTables3.address,
      payoutTables4.address,
      payoutTables3.address, // Placeholder for 5
      payoutTables3.address, // Placeholder for 6  
      payoutTables3.address  // Placeholder for 7
    );
    await payoutTables.deployed();

    // Deploy CasinoSlot with REAL Compound addresses - NO MOCKING
    const CasinoSlot = await ethers.getContractFactory("CasinoSlot");
    casinoSlot = await upgrades.deployProxy(
      CasinoSlot,
      [
        1, // VRF subscription ID
        ETH_USD_PRICE_FEED,
        payoutTables.address,
        mockVRFCoordinator.address,
        CHAINLINK_KEY_HASH,
        CETH_ADDRESS, // REAL cETH contract
        COMPTROLLER_ADDRESS, // REAL Comptroller contract
        owner.address
      ],
      { kind: "uups" }
    );
    await casinoSlot.deployed();

    // Owner buys lots of chips and transfers to contract for borrowing
    await casinoSlot.connect(owner).buyChips({ value: ethers.utils.parseEther("100") });
    const ownerBalance = await casinoSlot.balanceOf(owner.address);
    await casinoSlot.connect(owner).transfer(casinoSlot.address, ownerBalance);
    
    // Debug: verify contract has CHIPS
    const contractChipBalance = await casinoSlot.balanceOf(casinoSlot.address);
    console.log(`Contract CHIPS balance: ${ethers.utils.formatEther(contractChipBalance)}`);
  });

  describe("Debug CHIPS Calculation", function () {
    it("Should debug CHIPS calculation and contract balance", async function () {
      const contractBalance = await casinoSlot.balanceOf(casinoSlot.address);
      console.log(`Contract CHIPS balance: ${ethers.utils.formatEther(contractBalance)}`);
      
      const ethAmount = ethers.utils.parseEther("0.01");
      const chipsAmount = await casinoSlot.calculateChipsFromETH(ethAmount);
      console.log(`0.01 ETH converts to: ${ethers.utils.formatEther(chipsAmount)} CHIPS`);
      
      console.log(`Contract has enough? ${contractBalance.gte(chipsAmount)}`);
      console.log(`Contract balance (wei): ${contractBalance.toString()}`);
      console.log(`Required CHIPS (wei): ${chipsAmount.toString()}`);
    });
  });

  describe("Collateral Deposit with REAL Compound", function () {
    it("Should allow players to deposit ETH as collateral to REAL Compound", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      
      const tx = await casinoSlot.connect(player1).depositCollateral({ value: depositAmount });
      const receipt = await tx.wait();
      
      // Check event was emitted
      const event = receipt.events.find(e => e.event === "CollateralDeposited");
      expect(event.args.player).to.equal(player1.address);
      expect(event.args.ethAmount).to.equal(depositAmount);
      
      // Check REAL Compound liquidity
      const accountLiquidity = await casinoSlot.getAccountLiquidity(player1.address);
      expect(accountLiquidity).to.be.gt(0);
      
      console.log(`Real Compound liquidity: $${ethers.utils.formatUnits(accountLiquidity, 18)}`);
    });

    it("Should reject deposits of 0 ETH", async function () {
      await expect(
        casinoSlot.connect(player1).depositCollateral({ value: 0 })
      ).to.be.revertedWith("Must deposit ETH");
    });

    it("Should track multiple deposits correctly with REAL Compound", async function () {
      const deposit1 = ethers.utils.parseEther("1");
      const deposit2 = ethers.utils.parseEther("0.5");
      
      await casinoSlot.connect(player1).depositCollateral({ value: deposit1 });
      const liquidity1 = await casinoSlot.getAccountLiquidity(player1.address);
      
      await casinoSlot.connect(player1).depositCollateral({ value: deposit2 });
      const liquidity2 = await casinoSlot.getAccountLiquidity(player1.address);
      
      expect(liquidity2).to.be.gt(liquidity1);
      console.log(`After 1st deposit: $${ethers.utils.formatUnits(liquidity1, 18)}`);
      console.log(`After 2nd deposit: $${ethers.utils.formatUnits(liquidity2, 18)}`);
    });
  });

  describe("CHIPS Borrowing with REAL Compound", function () {
    beforeEach(async function () {
      // Player1 deposits 2 ETH as collateral to REAL Compound
      await casinoSlot.connect(player1).depositCollateral({ 
        value: ethers.utils.parseEther("2") 
      });
    });

    it("Should allow borrowing CHIPS against REAL Compound collateral", async function () {
      const borrowAmount = ethers.utils.parseEther("0.01");
      const initialChips = await casinoSlot.balanceOf(player1.address);
      
      const tx = await casinoSlot.connect(player1).borrowChips(borrowAmount);
      const receipt = await tx.wait();
      
      // Check event was emitted
      const event = receipt.events.find(e => e.event === "ChipsBorrowed");
      expect(event.args.player).to.equal(player1.address);
      expect(event.args.ethAmount).to.equal(borrowAmount);
      
      // Check CHIPS were transferred to player
      const finalChips = await casinoSlot.balanceOf(player1.address);
      expect(finalChips).to.be.gt(initialChips);
      
      // Check borrowed amount is tracked
      const borrowedETH = await casinoSlot.borrowedETH(player1.address);
      expect(borrowedETH).to.equal(borrowAmount);
      
      console.log(`Borrowed ${ethers.utils.formatEther(borrowAmount)} ETH worth of CHIPS`);
      console.log(`Received ${ethers.utils.formatEther(finalChips.sub(initialChips))} CHIPS`);
    });

    it("Should reject borrowing more than REAL Compound liquidity allows", async function () {
      const accountLiquidity = await casinoSlot.getAccountLiquidity(player1.address);
      const excessiveBorrow = ethers.utils.parseEther("10"); // Way more than liquidity
      
      console.log(`Account liquidity: $${ethers.utils.formatUnits(accountLiquidity, 18)}`);
      console.log(`Trying to borrow: ${ethers.utils.formatEther(excessiveBorrow)} ETH worth`);
      
      await expect(
        casinoSlot.connect(player1).borrowChips(excessiveBorrow)
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should calculate CHIPS amount correctly based on real ETH price", async function () {
      const borrowAmount = ethers.utils.parseEther("0.01");
      const initialChips = await casinoSlot.balanceOf(player1.address);
      
      await casinoSlot.connect(player1).borrowChips(borrowAmount);
      
      const finalChips = await casinoSlot.balanceOf(player1.address);
      const receivedChips = finalChips.sub(initialChips);
      
      // Should get significant amount based on real ETH price
      expect(receivedChips).to.be.gt(ethers.utils.parseEther("50"));
      console.log(`0.01 ETH borrowed → ${ethers.utils.formatEther(receivedChips)} CHIPS received`);
    });
  });

  describe("Leveraged Gambling Workflow with REAL Compound", function () {
    it("Should enable complete leveraged gambling cycle with REAL Compound backing", async function () {
      // Step 1: Player deposits ETH collateral to REAL Compound
      const collateralAmount = ethers.utils.parseEther("1");
      await casinoSlot.connect(player1).depositCollateral({ value: collateralAmount });
      
      // Step 2: Player borrows CHIPS against REAL collateral
      const borrowAmount = ethers.utils.parseEther("0.01");
      await casinoSlot.connect(player1).borrowChips(borrowAmount);
      
      const borrowedChips = await casinoSlot.balanceOf(player1.address);
      expect(borrowedChips).to.be.gt(0);
      
      // Step 3: Check player stats with REAL Compound data
      const playerStats = await casinoSlot.getPlayerStats(player1.address);
      expect(playerStats.borrowedAmount).to.equal(borrowAmount);
      expect(playerStats.accountLiquidity).to.be.gt(0); // Real Compound liquidity
      
      console.log(`Player borrowed ${ethers.utils.formatEther(borrowAmount)} ETH worth of CHIPS`);
      console.log(`CHIPS received: ${ethers.utils.formatEther(borrowedChips)}`);
      console.log(`Remaining liquidity: $${ethers.utils.formatUnits(playerStats.accountLiquidity, 18)}`);
      console.log(`Outstanding debt: ${ethers.utils.formatEther(playerStats.borrowedAmount)} ETH`);
    });

    it("Should allow repaying loan with CHIPS", async function () {
      // Setup: deposit and borrow
      await casinoSlot.connect(player1).depositCollateral({ value: ethers.utils.parseEther("1") });
      await casinoSlot.connect(player1).borrowChips(ethers.utils.parseEther("0.01"));
      
      // Owner needs to buy more CHIPS since they transferred all to contract in beforeEach
      await casinoSlot.connect(owner).buyChips({ value: ethers.utils.parseEther("1") });
      
      // Give player extra CHIPS to repay
      await casinoSlot.connect(owner).transfer(player1.address, ethers.utils.parseEther("100"));
      
      // Repay loan with CHIPS
      const repayAmount = ethers.utils.parseEther("5"); // 5 CHIPS
      await casinoSlot.connect(player1).approve(casinoSlot.address, repayAmount);
      
      const repayTx = await casinoSlot.connect(player1).repayLoan(repayAmount);
      const repayReceipt = await repayTx.wait();
      
      const repayEvent = repayReceipt.events.find(e => e.event === "LoanRepaid");
      expect(repayEvent.args.player).to.equal(player1.address);
      expect(repayEvent.args.chipsAmount).to.equal(repayAmount);
      
      // Check debt was reduced
      const finalDebt = await casinoSlot.borrowedETH(player1.address);
      expect(finalDebt).to.be.lt(ethers.utils.parseEther("0.01"));
      
      console.log(`Repaid with ${ethers.utils.formatEther(repayAmount)} CHIPS`);
      console.log(`Remaining debt: ${ethers.utils.formatEther(finalDebt)} ETH`);
    });

    it("Should allow repaying loan with ETH directly", async function () {
      // Setup: deposit and borrow
      await casinoSlot.connect(player1).depositCollateral({ value: ethers.utils.parseEther("1") });
      const borrowAmount = ethers.utils.parseEther("0.01");
      await casinoSlot.connect(player1).borrowChips(borrowAmount);
      
      const initialDebt = await casinoSlot.borrowedETH(player1.address);
      expect(initialDebt).to.equal(borrowAmount);
      
      // Repay with ETH
      const repayAmount = ethers.utils.parseEther("0.005"); // Half the borrow amount
      const repayTx = await casinoSlot.connect(player1).repayLoanWithETH({ value: repayAmount });
      const repayReceipt = await repayTx.wait();
      
      const repayEvent = repayReceipt.events.find(e => e.event === "ETHRepayment");
      expect(repayEvent.args.player).to.equal(player1.address);
      expect(repayEvent.args.ethAmount).to.equal(repayAmount);
      
      // Check debt was reduced
      const finalDebt = await casinoSlot.borrowedETH(player1.address);
      expect(finalDebt).to.equal(borrowAmount.sub(repayAmount));
      
      console.log(`Repaid ${ethers.utils.formatEther(repayAmount)} ETH directly`);
      console.log(`Remaining debt: ${ethers.utils.formatEther(finalDebt)} ETH`);
    });
  });

  describe("Risk Management with REAL Compound", function () {
    it("Should prevent borrowing without REAL collateral", async function () {
      // Player1 has no collateral in REAL Compound
      const liquidity = await casinoSlot.getAccountLiquidity(player1.address);
      expect(liquidity).to.equal(0);
      
      await expect(
        casinoSlot.connect(player1).borrowChips(ethers.utils.parseEther("0.1"))
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should prevent repaying more than owed", async function () {
      await casinoSlot.connect(player1).depositCollateral({ value: ethers.utils.parseEther("1") });
      await casinoSlot.connect(player1).borrowChips(ethers.utils.parseEther("0.01"));
      
      const excessiveRepay = ethers.utils.parseEther("0.1"); // More than borrowed
      await expect(
        casinoSlot.connect(player1).repayLoanWithETH({ value: excessiveRepay })
      ).to.be.revertedWith("Repayment exceeds loan");
    });

    it("Should track multiple borrowers independently with REAL Compound", async function () {
      // Player1 setup
      await casinoSlot.connect(player1).depositCollateral({ value: ethers.utils.parseEther("1") });
      await casinoSlot.connect(player1).borrowChips(ethers.utils.parseEther("0.01"));
      
      // Player2 setup  
      await casinoSlot.connect(player2).depositCollateral({ value: ethers.utils.parseEther("2") });
      await casinoSlot.connect(player2).borrowChips(ethers.utils.parseEther("0.02"));
      
      // Check independent tracking
      const player1Stats = await casinoSlot.getPlayerStats(player1.address);
      const player2Stats = await casinoSlot.getPlayerStats(player2.address);
      
      expect(player1Stats.borrowedAmount).to.equal(ethers.utils.parseEther("0.01"));
      expect(player2Stats.borrowedAmount).to.equal(ethers.utils.parseEther("0.02"));
      expect(player2Stats.accountLiquidity).to.be.gt(player1Stats.accountLiquidity);
      
      console.log(`Player1 - Debt: ${ethers.utils.formatEther(player1Stats.borrowedAmount)} ETH, Liquidity: $${ethers.utils.formatUnits(player1Stats.accountLiquidity, 18)}`);
      console.log(`Player2 - Debt: ${ethers.utils.formatEther(player2Stats.borrowedAmount)} ETH, Liquidity: $${ethers.utils.formatUnits(player2Stats.accountLiquidity, 18)}`);
    });
  });

  describe("Price Feed Integration", function () {
    it("Should use real ETH price for CHIPS calculations", async function () {
      // Test that the contract can get ETH price and calculate CHIPS correctly
      const ethAmount = ethers.utils.parseEther("1");
      const chipsAmount = await casinoSlot.calculateChipsFromETH(ethAmount);
      
      expect(chipsAmount).to.be.gt(0);
      console.log(`1 ETH converts to ${ethers.utils.formatEther(chipsAmount)} CHIPS`);
      
      // Reverse calculation
      const ethFromChips = await casinoSlot.calculateETHFromChips(chipsAmount);
      expect(ethFromChips).to.be.closeTo(ethAmount, ethers.utils.parseEther("0.01"));
    });

    it("Should get pool statistics", async function () {
      // Add some ETH to contract
      await owner.sendTransaction({
        to: casinoSlot.address,
        value: ethers.utils.parseEther("5")
      });
      
      const stats = await casinoSlot.getPoolStats();
      expect(stats.totalETH).to.be.gt(0);
      expect(stats.chipPrice).to.be.gt(0);
      expect(stats.ethPrice).to.be.gt(0);
      
      console.log(`Pool Stats: ${ethers.utils.formatEther(stats.totalETH)} ETH, Chip Price: ${stats.chipPrice}, ETH Price: $${stats.ethPrice/100}`);
    });
  });
}); 