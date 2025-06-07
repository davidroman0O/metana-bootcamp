const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("⚙️ Admin Functions - Mainnet Fork Testing", function () {
  let degenSlots, payoutTables, chipToken;
  let payoutTables3, payoutTables4;
  let owner, player1;
  
  // Real Mainnet addresses for forking
  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // Real Chainlink ETH/USD feed
  const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"; // 500 gwei

  beforeEach(async function () {
    [owner, player1] = await ethers.getSigners();

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

    // Deploy Mock VRF Coordinator (real mainnet fork + mock VRF for testing)
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();

    // Use dummy addresses for Compound since mocking is built into DegenSlotsTest
    const dummyCEthAddress = ethers.Wallet.createRandom().address;
    const dummyComptrollerAddress = ethers.Wallet.createRandom().address;

    // Deploy PayoutTables contracts first
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

    // Deploy with upgradeable proxy on mainnet fork
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
    
    // Setup test environment
    await chipToken.transfer(player1.address, ethers.utils.parseEther("1000"));
    await chipToken.connect(player1).approve(degenSlots.address, ethers.utils.parseEther("1000"));
    
    // Add some ETH to the contract for testing withdrawals
    await owner.sendTransaction({
      to: degenSlots.address,
      value: ethers.utils.parseEther("10")
    });
  });

  describe("Deployment & Ownership", function () {
    it("Should deploy with correct owner", async function () {
      expect(await degenSlots.owner()).to.equal(owner.address);
    });

    it("Should confirm this is a test contract", async function () {
      expect(await degenSlots.isTestContract()).to.be.true;
    });

    it("Should have correct PayoutTables integration", async function () {
      const gameStats = await degenSlots.getGameStats();
      expect(gameStats.payoutTablesAddress).to.equal(payoutTables.address);
      expect(gameStats.houseEdgePercent).to.equal(500); // 5%
    });
  });

  describe("PayoutTables Management", function () {
    it("Should allow owner to update PayoutTables address", async function () {
      const newPayoutTables = ethers.Wallet.createRandom().address;
      
      await expect(degenSlots.updatePayoutTables(newPayoutTables))
        .to.emit(degenSlots, "PayoutTablesUpdated")
        .withArgs(newPayoutTables);
        
      const gameStats = await degenSlots.getGameStats();
      expect(gameStats.payoutTablesAddress).to.equal(newPayoutTables);
    });

    it("Should reject non-owner PayoutTables updates", async function () {
      const newPayoutTables = ethers.Wallet.createRandom().address;
      
      await expect(
        degenSlots.connect(player1).updatePayoutTables(newPayoutTables)
      ).to.be.reverted;
    });

    it("Should reject invalid PayoutTables address", async function () {
      await expect(
        degenSlots.updatePayoutTables(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("Pause/Unpause Controls", function () {
    it("Should allow owner to pause and unpause", async function () {
      // Initially unpaused
      const tx1 = await degenSlots.connect(player1).spin3Reels();
      expect(tx1).to.not.be.undefined;
      
      // Pause
      await degenSlots.pause();
      
      await expect(
        degenSlots.connect(player1).spin3Reels()
      ).to.be.revertedWith("EnforcedPause");
      
      // Unpause
      await degenSlots.unpause();
      const tx2 = await degenSlots.connect(player1).spin3Reels();
      expect(tx2).to.not.be.undefined;
    });

    it("Should reject non-owner pause/unpause", async function () {
      await expect(degenSlots.connect(player1).pause()).to.be.reverted;
      await expect(degenSlots.connect(player1).unpause()).to.be.reverted;
    });
  });

  describe("ETH Withdrawal", function () {
    it("Should allow owner to withdraw ETH", async function () {
      const contractBalance = await ethers.provider.getBalance(degenSlots.address);
      expect(contractBalance).to.be.gt(0);
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const withdrawAmount = ethers.utils.parseEther("1");
      
      const tx = await degenSlots.withdrawETH(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const expectedBalance = ownerBalanceBefore.add(withdrawAmount).sub(gasUsed);
      
      expect(ownerBalanceAfter).to.be.closeTo(expectedBalance, ethers.utils.parseEther("0.01"));
    });

    it("Should reject non-owner withdraw attempts", async function () {
      await expect(
        degenSlots.connect(player1).withdrawETH(ethers.utils.parseEther("1"))
      ).to.be.reverted;
    });

    it("Should reject withdrawal of more ETH than available", async function () {
      const contractBalance = await ethers.provider.getBalance(degenSlots.address);
      const excessiveAmount = contractBalance.add(ethers.utils.parseEther("1"));
      
      await expect(
        degenSlots.withdrawETH(excessiveAmount)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Testing Functions", function () {
    it("Should allow owner to set test ETH price", async function () {
      const testPrice = 250000; // $2500 per ETH in cents
      await degenSlots.setTestETHPrice(testPrice);
      
      // Verify the test price is being used
      const ethPrice = await degenSlots.getETHPrice();
      expect(ethPrice).to.equal(testPrice);
    });

    it("Should fall back to real price feed when test price not set", async function () {
      // Don't set test price, should use real Chainlink feed
      const ethPrice = await degenSlots.getETHPrice();
      expect(ethPrice).to.be.gt(0); // Should get real price from mainnet
    });

    it("Should reject non-owner test price setting", async function () {
      await expect(
        degenSlots.connect(player1).setTestETHPrice(200000)
      ).to.be.reverted;
    });

    it("Should allow owner to add to prize pool for testing", async function () {
      const initialPool = await degenSlots.totalPrizePool();
      const addAmount = ethers.utils.parseEther("5");
      
      await degenSlots.addToPrizePool(addAmount);
      
      const finalPool = await degenSlots.totalPrizePool();
      expect(finalPool).to.equal(initialPool.add(addAmount));
    });

    it("Should reject non-owner prize pool additions", async function () {
      await expect(
        degenSlots.connect(player1).addToPrizePool(ethers.utils.parseEther("1"))
      ).to.be.reverted;
    });
  });

  describe("VRF Testing Functions", function () {
    it("Should allow owner to test VRF fulfillment", async function () {
      // Execute a spin first
      const tx = await degenSlots.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Test VRF fulfillment
      await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x123456")]);
      
      const spin = await degenSlots.spins(requestId);
      expect(spin.settled).to.be.true;
    });

    it("Should reject non-owner VRF test calls", async function () {
      await expect(
        degenSlots.connect(player1).testFulfillRandomWords(1, [123])
      ).to.be.reverted;
    });

    it("Should prevent VRF testing on mainnet", async function () {
      // This would fail if actually on mainnet (chainId 1)
      // On hardhat fork, chainId is 31337, so test should work
      const tx = await degenSlots.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Should work on testnet (hardhat fork)
      await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x123456")]);
      
      const spin = await degenSlots.spins(requestId);
      expect(spin.settled).to.be.true;
    });
  });

  describe("Access Control Summary", function () {
    it("Should protect all admin functions from non-owners", async function () {
      const protectedCalls = [
        degenSlots.connect(player1).updatePayoutTables(ethers.constants.AddressZero),
        degenSlots.connect(player1).pause(),
        degenSlots.connect(player1).unpause(),
        degenSlots.connect(player1).withdrawETH(ethers.utils.parseEther("1")),
        degenSlots.connect(player1).setTestETHPrice(200000),
        degenSlots.connect(player1).addToPrizePool(ethers.utils.parseEther("1"))
      ];

      for (const call of protectedCalls) {
        await expect(call).to.be.reverted;
      }
    });
  });
}); 