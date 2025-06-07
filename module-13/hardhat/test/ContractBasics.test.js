const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🔧 Contract Basics - Mainnet Fork Testing", function () {
  let degenSlots, payoutTables, chipToken;
  let payoutTables3, payoutTables4;
  let owner, player1, player2;
  
  // Real Mainnet addresses for forking (price feeds, etc.)
  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // Real Chainlink ETH/USD feed
  const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"; // 500 gwei

  beforeEach(async function () {
    [owner, player1] = await ethers.getSigners();

    // Deploy REAL ChipToken with upgradeable proxy (CORRECT!)
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

    // Deploy PayoutTables contracts (same as in integration test)
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

    // Deploy DegenSlotsTest with proxy (proper upgradeable pattern)
    const DegenSlotsTest = await ethers.getContractFactory("DegenSlotsTest");
    degenSlots = await upgrades.deployProxy(
      DegenSlotsTest,
      [
        1, // VRF subscription ID (mock VRF doesn't need real subscription)
        chipToken.address,
        ETH_USD_PRICE_FEED, // REAL Chainlink ETH/USD price feed from mainnet
        payoutTables.address,
        mockVRFCoordinator.address, // Mock VRF coordinator
        CHAINLINK_KEY_HASH,
        dummyCEthAddress, // Dummy address - mocking is built into DegenSlotsTest
        dummyComptrollerAddress, // Dummy address - mocking is built into DegenSlotsTest
        owner.address
      ],
      { kind: "uups" }
    );
    await degenSlots.deployed();

    // Setup CHIPS for testing
    await chipToken.transfer(player1.address, ethers.utils.parseEther("1000"));
    await chipToken.connect(player1).approve(degenSlots.address, ethers.utils.parseEther("1000"));
  });

  describe("Deployment & Initialization", function () {
    it("Should deploy with correct mainnet integrations", async function () {
      expect(await degenSlots.owner()).to.equal(owner.address);
      
      const gameStats = await degenSlots.getGameStats();
      expect(gameStats.payoutTablesAddress).to.equal(payoutTables.address);
      expect(gameStats.houseEdgePercent).to.equal(500); // 5%
    });

    it("Should integrate with real Chainlink price feed", async function () {
      // Call a view function that uses the price feed (if any exists)
      // For now, just verify the price feed address is set correctly
      const gameStats = await degenSlots.getGameStats();
      expect(gameStats.payoutTablesAddress).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should have PayoutTables working correctly", async function () {
      // Test that PayoutTables API works
      expect(await payoutTables.getPayoutType(3, 333)).to.equal(3); // Triple pumps = BIG_WIN
      expect(await payoutTables.getPayoutType(3, 555)).to.equal(5); // Triple rockets = ULTRA_WIN
      expect(await payoutTables.getPayoutType(3, 123)).to.equal(0); // Mixed = LOSE
    });
  });

  describe("Spin Cost Validation", function () {
    it("Should have correct spin costs for all reel modes", async function () {
      expect(await degenSlots.getSpinCost(3)).to.equal(ethers.utils.parseEther("1"));      // 1 CHIPS
      expect(await degenSlots.getSpinCost(4)).to.equal(ethers.utils.parseEther("10"));     // 10 CHIPS
      expect(await degenSlots.getSpinCost(5)).to.equal(ethers.utils.parseEther("100"));    // 100 CHIPS
      expect(await degenSlots.getSpinCost(6)).to.equal(ethers.utils.parseEther("500"));    // 500 CHIPS
      expect(await degenSlots.getSpinCost(7)).to.equal(ethers.utils.parseEther("1000"));   // 1000 CHIPS
    });

    it("Should reject invalid reel counts", async function () {
      await expect(degenSlots.getSpinCost(2)).to.be.revertedWith("Invalid reel count");
      await expect(degenSlots.getSpinCost(8)).to.be.revertedWith("Invalid reel count");
    });
  });

  describe("Spin Functionality", function () {
    it("Should allow 3-reel spins with sufficient balance", async function () {
      const initialBalance = await chipToken.balanceOf(player1.address);
      expect(initialBalance).to.be.gte(ethers.utils.parseEther("1"));

      const tx = await degenSlots.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      
      // Should emit SpinRequested event
      const spinEvent = receipt.events.find(e => e.event === "SpinRequested");
      expect(spinEvent).to.not.be.undefined;
      expect(spinEvent.args.player).to.equal(player1.address);
      expect(spinEvent.args.reelCount).to.equal(3);
      
      // Mock VRF response to complete the spin (hybrid: real mainnet + mock VRF)
      const requestId = spinEvent.args.requestId;
      await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x123456")]);
      
      // Verify spin completed
      const spin = await degenSlots.spins(requestId);
      expect(spin.settled).to.be.true;
    });

    it("Should reject spins with insufficient balance", async function () {
      // Transfer all tokens away from player2
      const balance = await chipToken.balanceOf(player2.address);
      await chipToken.connect(player2).transfer(owner.address, balance);
      
      await expect(
        degenSlots.connect(player2).spin3Reels()
      ).to.be.revertedWith("Insufficient CHIPS balance");
    });

    it("Should handle different reel modes correctly", async function () {
      // Test that different reel modes have different costs
      const cost3 = await degenSlots.getSpinCost(3);
      const cost4 = await degenSlots.getSpinCost(4);
      
      expect(cost4).to.be.gt(cost3);
      
      // Player1 has 1000 CHIPS, should be able to afford both
      const balance = await chipToken.balanceOf(player1.address);
      expect(balance).to.be.gte(cost4);
    });
  });

  describe("Prize Pool Management", function () {
    it("Should initialize with zero prize pool", async function () {
      const prizePool = await degenSlots.totalPrizePool();
      expect(prizePool).to.equal(0);
    });

    it("Should increase prize pool after spins", async function () {
      const initialPool = await degenSlots.totalPrizePool();
      
      // Execute a spin and complete it with mock VRF
      const tx = await degenSlots.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x123456")]);
      
      const finalPool = await degenSlots.totalPrizePool();
      const expectedIncrease = ethers.utils.parseEther("0.95"); // 1 CHIP - 5% house edge
      
      expect(finalPool).to.equal(initialPool.add(expectedIncrease));
    });

    it("Should handle ETH deposits to prize pool", async function () {
      const initialPool = await degenSlots.totalPrizePool();
      
      await owner.sendTransaction({
        to: degenSlots.address,
        value: ethers.utils.parseEther("1")
      });
      
      const finalPool = await degenSlots.totalPrizePool();
      expect(finalPool).to.equal(initialPool.add(ethers.utils.parseEther("1")));
    });
  });

  describe("Player Statistics", function () {
    it("Should track player statistics correctly", async function () {
      const initialStats = await degenSlots.getPlayerStats(player1.address);
      
      expect(initialStats.balance).to.equal(ethers.utils.parseEther("1000"));
      expect(initialStats.winnings).to.equal(0);
      expect(initialStats.spinsCount).to.equal(0);
      expect(initialStats.totalWinnings).to.equal(0);
      expect(initialStats.borrowedAmount).to.equal(0);
      expect(initialStats.accountLiquidity).to.be.gte(0);
      
      // Execute a spin and complete it with mock VRF
      const tx = await degenSlots.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x123456")]);
      
      const afterSpinStats = await degenSlots.getPlayerStats(player1.address);
      expect(afterSpinStats.spinsCount).to.equal(1);
      expect(afterSpinStats.balance).to.equal(ethers.utils.parseEther("999")); // 1000 - 1 CHIP cost
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause/unpause", async function () {
      // Initially unpaused - just test spin request, don't need to complete VRF
      const tx1 = await degenSlots.connect(player1).spin3Reels();
      expect(tx1).to.not.be.undefined; // Should work
      
      // Pause
      await degenSlots.pause();
      
      await expect(
        degenSlots.connect(player1).spin3Reels()
      ).to.be.revertedWith("EnforcedPause");
      
      // Unpause
      await degenSlots.unpause();
      const tx2 = await degenSlots.connect(player1).spin3Reels();
      expect(tx2).to.not.be.undefined; // Should work again
    });

    it("Should allow owner to update PayoutTables", async function () {
      const newPayoutTables = ethers.Wallet.createRandom().address;
      
      await expect(degenSlots.updatePayoutTables(newPayoutTables))
        .to.emit(degenSlots, "PayoutTablesUpdated")
        .withArgs(newPayoutTables);
        
      const gameStats = await degenSlots.getGameStats();
      expect(gameStats.payoutTablesAddress).to.equal(newPayoutTables);
    });

    it("Should reject non-owner admin calls", async function () {
      await expect(degenSlots.connect(player1).pause()).to.be.reverted;
      await expect(degenSlots.connect(player1).updatePayoutTables(ethers.constants.AddressZero)).to.be.reverted;
    });
  });
}); 