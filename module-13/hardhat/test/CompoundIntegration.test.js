const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🏦 Compound Integration - Leveraged Gambling", function () {
  let degenSlots, payoutTables, chipToken;
  let payoutTables3, payoutTables4;
  let owner, player1, player2;
  
  // Real Mainnet addresses for forking
  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // Real Chainlink ETH/USD feed
  const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"; // 500 gwei

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy real ChipToken with upgradeable proxy
    const ChipToken = await ethers.getContractFactory("ChipToken");
    chipToken = await upgrades.deployProxy(
      ChipToken,
      [owner.address],
      { kind: "uups" }
    );
    await chipToken.deployed();

    // Mint initial supply for testing
    await chipToken.mint(owner.address, ethers.utils.parseEther("1000000"));

    // Deploy Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();

    // Use dummy addresses for Compound since mocking is built into DegenSlotsTest
    const dummyCEthAddress = ethers.Wallet.createRandom().address;
    const dummyComptrollerAddress = ethers.Wallet.createRandom().address;

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

    // Deploy DegenSlotsTest with upgradeable proxy (like your working NFT examples)
    const DegenSlotsTest = await ethers.getContractFactory("DegenSlotsTest");
    degenSlots = await upgrades.deployProxy(
      DegenSlotsTest,
      [
        1, // VRF subscription ID
        chipToken.address,
        ETH_USD_PRICE_FEED,
        payoutTables.address,
        mockVRFCoordinator.address,
        CHAINLINK_KEY_HASH,
        dummyCEthAddress, // Dummy address - mocking is built into DegenSlotsTest
        dummyComptrollerAddress, // Dummy address - mocking is built into DegenSlotsTest
        owner.address
      ],
      { kind: "uups" }
    );
    await degenSlots.deployed();

    // Add CHIPS to the contract for borrowing (need more due to high ETH price)
    await chipToken.transfer(degenSlots.address, ethers.utils.parseEther("500000")); // 500K CHIPS
    
    // Debug: verify contract has CHIPS
    const contractChipBalance = await chipToken.balanceOf(degenSlots.address);
    console.log(`Contract CHIPS balance: ${ethers.utils.formatEther(contractChipBalance)}`);
  });

  describe("Debug CHIPS Calculation", function () {
    it("Should debug CHIPS calculation and contract balance", async function () {
      const contractBalance = await chipToken.balanceOf(degenSlots.address);
      console.log(`Contract CHIPS balance: ${ethers.utils.formatEther(contractBalance)}`);
      
      const ethAmount = ethers.utils.parseEther("0.01");
      const chipsAmount = await degenSlots.calculateChipsFromETH(ethAmount);
      console.log(`0.01 ETH converts to: ${ethers.utils.formatEther(chipsAmount)} CHIPS`);
      
      console.log(`Contract has enough? ${contractBalance.gte(chipsAmount)}`);
      console.log(`Contract balance (wei): ${contractBalance.toString()}`);
      console.log(`Required CHIPS (wei): ${chipsAmount.toString()}`);
    });
  });

  describe("Collateral Deposit", function () {
    it("Should allow players to deposit ETH as collateral", async function () {
      const depositAmount = ethers.utils.parseEther("1"); // 1 ETH
      
      const tx = await degenSlots.connect(player1).depositCollateral({ value: depositAmount });
      const receipt = await tx.wait();
      
      // Check event was emitted
      const event = receipt.events.find(e => e.event === "CollateralDeposited");
      expect(event.args.player).to.equal(player1.address);
      expect(event.args.ethAmount).to.equal(depositAmount);
      
      // Check mock state was updated
      const cEthBalance = await degenSlots.getMockCEthBalance(player1.address);
      expect(cEthBalance).to.equal(depositAmount);
      
      // Check account liquidity (75% collateral factor)
      const liquidity = await degenSlots.getMockAccountLiquidity(player1.address);
      const expectedLiquidity = depositAmount.mul(75).div(100);
      expect(liquidity).to.equal(expectedLiquidity);
    });

    it("Should reject deposits of 0 ETH", async function () {
      await expect(
        degenSlots.connect(player1).depositCollateral({ value: 0 })
      ).to.be.revertedWith("Must deposit ETH");
    });

    it("Should track multiple deposits correctly", async function () {
      const deposit1 = ethers.utils.parseEther("1");
      const deposit2 = ethers.utils.parseEther("0.5");
      
      await degenSlots.connect(player1).depositCollateral({ value: deposit1 });
      await degenSlots.connect(player1).depositCollateral({ value: deposit2 });
      
      const totalCEth = await degenSlots.getMockCEthBalance(player1.address);
      expect(totalCEth).to.equal(deposit1.add(deposit2));
      
      const totalLiquidity = await degenSlots.getMockAccountLiquidity(player1.address);
      const expectedLiquidity = deposit1.add(deposit2).mul(75).div(100);
      expect(expectedLiquidity).to.equal(totalLiquidity);
    });
  });

  describe("CHIPS Borrowing", function () {
    beforeEach(async function () {
      // Player1 deposits 2 ETH as collateral
      await degenSlots.connect(player1).depositCollateral({ 
        value: ethers.utils.parseEther("2") 
      });
    });

    it("Should allow borrowing CHIPS against collateral", async function () {
      const borrowAmount = ethers.utils.parseEther("0.01"); // Borrow equivalent of 0.01 ETH (much smaller)
      const initialChips = await chipToken.balanceOf(player1.address);
      
      const tx = await degenSlots.connect(player1).borrowChips(borrowAmount);
      const receipt = await tx.wait();
      
      // Check event was emitted
      const event = receipt.events.find(e => e.event === "ChipsBorrowed");
      expect(event.args.player).to.equal(player1.address);
      expect(event.args.ethAmount).to.equal(borrowAmount);
      
      // Check CHIPS were transferred to player
      const finalChips = await chipToken.balanceOf(player1.address);
      expect(finalChips).to.be.gt(initialChips);
      
      // Check borrowed amount is tracked
      const borrowedETH = await degenSlots.borrowedETH(player1.address);
      expect(borrowedETH).to.equal(borrowAmount);
      
      // Check liquidity was reduced
      const remainingLiquidity = await degenSlots.getMockAccountLiquidity(player1.address);
      const expectedLiquidity = ethers.utils.parseEther("2").mul(75).div(100).sub(borrowAmount);
      expect(remainingLiquidity).to.equal(expectedLiquidity);
    });

    it("Should reject borrowing more than available liquidity", async function () {
      const excessiveBorrow = ethers.utils.parseEther("2"); // More than 75% of 2 ETH
      
      await expect(
        degenSlots.connect(player1).borrowChips(excessiveBorrow)
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should calculate CHIPS amount correctly based on ETH price", async function () {
      const borrowAmount = ethers.utils.parseEther("0.01"); // 0.01 ETH worth
      const initialChips = await chipToken.balanceOf(player1.address);
      
      await degenSlots.connect(player1).borrowChips(borrowAmount);
      
      const finalChips = await chipToken.balanceOf(player1.address);
      const receivedChips = finalChips.sub(initialChips);
      
      // With ETH at ~$1800, 0.01 ETH = $18, so should get 90 CHIPS (5 CHIPS per $1)
      expect(receivedChips).to.be.gt(ethers.utils.parseEther("50")); // Should be significant amount
    });
  });

  describe("Leveraged Gambling Workflow", function () {
    it("Should enable complete leveraged gambling cycle", async function () {
      // Step 1: Player deposits ETH collateral
      const collateralAmount = ethers.utils.parseEther("1");
      await degenSlots.connect(player1).depositCollateral({ value: collateralAmount });
      
      // Step 2: Player borrows CHIPS
      const borrowAmount = ethers.utils.parseEther("0.01"); // Much smaller amount
      await degenSlots.connect(player1).borrowChips(borrowAmount);
      
      const borrowedChips = await chipToken.balanceOf(player1.address);
      expect(borrowedChips).to.be.gt(0);
      
      // Step 3: Player approves and gambles with borrowed CHIPS
      await chipToken.connect(player1).approve(degenSlots.address, borrowedChips);
      
      const tx = await degenSlots.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Step 4: Mock a winning outcome
      await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("131090")]); // [3,3,3] = BIG_WIN
      
      // Step 5: Player should have winnings
      const playerStats = await degenSlots.getPlayerStats(player1.address);
      expect(playerStats.winnings).to.be.gt(0);
      expect(playerStats.borrowedAmount).to.equal(borrowAmount);
      
      console.log(`Player borrowed ${ethers.utils.formatEther(borrowAmount)} ETH worth of CHIPS`);
      console.log(`Player won ${ethers.utils.formatEther(playerStats.winnings)} CHIPS`);
      console.log(`Outstanding debt: ${ethers.utils.formatEther(playerStats.borrowedAmount)} ETH`);
    });

    it("Should allow repaying loan with CHIPS winnings", async function () {
      // Setup: deposit, borrow, win
      await degenSlots.connect(player1).depositCollateral({ value: ethers.utils.parseEther("1") });
      await degenSlots.connect(player1).borrowChips(ethers.utils.parseEther("0.01")); // Smaller amount
      
      const borrowedChips = await chipToken.balanceOf(player1.address);
      await chipToken.connect(player1).approve(degenSlots.address, borrowedChips);
      
      const tx = await degenSlots.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("131090")]); // Win
      
      // Withdraw winnings
      await degenSlots.connect(player1).withdrawWinnings();
      
      // Repay loan with CHIPS
      const repayAmount = ethers.utils.parseEther("5"); // 5 CHIPS = $1 = some ETH equivalent
      await chipToken.connect(player1).approve(degenSlots.address, repayAmount);
      
      const repayTx = await degenSlots.connect(player1).repayLoan(repayAmount);
      const repayReceipt = await repayTx.wait();
      
      const repayEvent = repayReceipt.events.find(e => e.event === "LoanRepaid");
      expect(repayEvent.args.player).to.equal(player1.address);
      expect(repayEvent.args.chipsAmount).to.equal(repayAmount);
      
      // Check debt was reduced
      const finalDebt = await degenSlots.borrowedETH(player1.address);
      expect(finalDebt).to.be.lt(ethers.utils.parseEther("0.01"));
    });

    it("Should allow repaying loan with ETH directly", async function () {
      // Setup: deposit and borrow
      await degenSlots.connect(player1).depositCollateral({ value: ethers.utils.parseEther("1") });
      const borrowAmount = ethers.utils.parseEther("0.01"); // Smaller amount
      await degenSlots.connect(player1).borrowChips(borrowAmount);
      
      const initialDebt = await degenSlots.borrowedETH(player1.address);
      expect(initialDebt).to.equal(borrowAmount);
      
      // Repay with ETH
      const repayAmount = ethers.utils.parseEther("0.005"); // Half the borrow amount
      const repayTx = await degenSlots.connect(player1).repayLoanWithETH({ value: repayAmount });
      const repayReceipt = await repayTx.wait();
      
      const repayEvent = repayReceipt.events.find(e => e.event === "ETHRepayment");
      expect(repayEvent.args.player).to.equal(player1.address);
      expect(repayEvent.args.ethAmount).to.equal(repayAmount);
      
      // Check debt was reduced
      const finalDebt = await degenSlots.borrowedETH(player1.address);
      expect(finalDebt).to.equal(borrowAmount.sub(repayAmount));
      
      // Check liquidity was restored
      const restoredLiquidity = await degenSlots.getMockAccountLiquidity(player1.address);
      expect(restoredLiquidity).to.be.gt(0);
    });
  });

  describe("Risk Management", function () {
    it("Should prevent borrowing without collateral", async function () {
      await expect(
        degenSlots.connect(player1).borrowChips(ethers.utils.parseEther("0.1"))
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should prevent repaying more than owed", async function () {
      await degenSlots.connect(player1).depositCollateral({ value: ethers.utils.parseEther("1") });
      await degenSlots.connect(player1).borrowChips(ethers.utils.parseEther("0.01")); // Smaller amount
      
      const excessiveRepay = ethers.utils.parseEther("0.1"); // Still more than borrowed
      await expect(
        degenSlots.connect(player1).repayLoanWithETH({ value: excessiveRepay })
      ).to.be.revertedWith("Repayment exceeds loan");
    });

    it("Should track multiple borrowers independently", async function () {
      // Player1 setup
      await degenSlots.connect(player1).depositCollateral({ value: ethers.utils.parseEther("1") });
      await degenSlots.connect(player1).borrowChips(ethers.utils.parseEther("0.01")); // Smaller amount
      
      // Player2 setup  
      await degenSlots.connect(player2).depositCollateral({ value: ethers.utils.parseEther("2") });
      await degenSlots.connect(player2).borrowChips(ethers.utils.parseEther("0.02")); // Smaller amount
      
      // Check independent tracking
      const player1Debt = await degenSlots.borrowedETH(player1.address);
      const player2Debt = await degenSlots.borrowedETH(player2.address);
      
      expect(player1Debt).to.equal(ethers.utils.parseEther("0.01"));
      expect(player2Debt).to.equal(ethers.utils.parseEther("0.02"));
      
      const player1Stats = await degenSlots.getPlayerStats(player1.address);
      const player2Stats = await degenSlots.getPlayerStats(player2.address);
      
      expect(player1Stats.borrowedAmount).to.equal(ethers.utils.parseEther("0.01"));
      expect(player2Stats.borrowedAmount).to.equal(ethers.utils.parseEther("0.02"));
    });
  });

  describe("Price Feed Integration", function () {
    it("Should use real ETH price for CHIPS calculations", async function () {
      // Test that the contract can get ETH price and calculate CHIPS correctly
      const ethAmount = ethers.utils.parseEther("1");
      const chipsAmount = await degenSlots.calculateChipsFromETH(ethAmount);
      
      expect(chipsAmount).to.be.gt(0);
      console.log(`1 ETH converts to ${ethers.utils.formatEther(chipsAmount)} CHIPS`);
      
      // Reverse calculation
      const ethFromChips = await degenSlots.calculateETHFromChips(chipsAmount);
      expect(ethFromChips).to.be.closeTo(ethAmount, ethers.utils.parseEther("0.01"));
    });

    it("Should get pool statistics", async function () {
      // Add some ETH to contract
      await owner.sendTransaction({
        to: degenSlots.address,
        value: ethers.utils.parseEther("5")
      });
      
      const stats = await degenSlots.getPoolStats();
      expect(stats.totalETH).to.be.gt(0);
      expect(stats.chipPrice).to.be.gt(0);
      expect(stats.ethPrice).to.be.gt(0);
      
      console.log(`Pool Stats: ${ethers.utils.formatEther(stats.totalETH)} ETH, Chip Price: ${stats.chipPrice}, ETH Price: $${stats.ethPrice/100}`);
    });
  });
}); 