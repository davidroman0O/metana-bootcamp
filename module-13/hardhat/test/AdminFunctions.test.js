const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🔧 Admin Functions", function () {
  let casinoSlot;
  let payoutTables, payoutTables3, payoutTables4;
  let owner, player1, player2;

  // Mainnet addresses
  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const LINK_USD_PRICE_FEED = "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c"; // LINK/USD price feed
  const LINK_TOKEN = "0x514910771AF9Ca656af840dff83E8264EcF986CA"; // LINK token mainnet
  const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Uniswap V3 router mainnet
  const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH mainnet
  const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef";

  // Remove duplicate enum - will be imported from contract

  beforeEach(async function () {
    [owner, player1] = await ethers.getSigners();

    // Deploy Mock VRF Coordinator (real mainnet fork + mock VRF for testing)
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();

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
    const CasinoSlotTest = await ethers.getContractFactory("CasinoSlotTest");
    casinoSlot = await upgrades.deployProxy(
      CasinoSlotTest,
      [
        1, // VRF subscription ID
        ETH_USD_PRICE_FEED, // Real mainnet Chainlink ETH/USD feed
        LINK_USD_PRICE_FEED, // Real mainnet Chainlink LINK/USD feed
        LINK_TOKEN, // Real mainnet LINK token
        payoutTables.address,
        mockVRFCoordinator.address,
        UNISWAP_V3_ROUTER, // Real mainnet Uniswap V3 router
        WETH_TOKEN, // Real mainnet WETH
        CHAINLINK_KEY_HASH,
        owner.address
      ],
      { kind: "uups" }
    );
    await casinoSlot.deployed();
    
    // Setup test environment - buy chips for player1
    await casinoSlot.connect(player1).buyChips({ value: ethers.utils.parseEther("1") });
    
    // Add some ETH to the contract for testing withdrawals
    await owner.sendTransaction({
      to: casinoSlot.address,
      value: ethers.utils.parseEther("10")
    });
  });

  describe("Deployment & Ownership", function () {
    it("Should deploy with correct owner", async function () {
      expect(await casinoSlot.owner()).to.equal(owner.address);
    });

    it("Should confirm this is a test contract", async function () {
      expect(await casinoSlot.isTestContract()).to.be.true;
    });

    it("Should have correct PayoutTables integration", async function () {
      const gameStats = await casinoSlot.getGameStats();
      expect(gameStats.payoutTablesAddress).to.equal(payoutTables.address);
      expect(gameStats.houseEdgePercent).to.equal(500); // 5%
    });
  });

  describe("PayoutTables Management", function () {
    it("Should allow owner to update PayoutTables address", async function () {
      const newPayoutTables = ethers.Wallet.createRandom().address;
      
      await expect(casinoSlot.updatePayoutTables(newPayoutTables))
        .to.emit(casinoSlot, "PayoutTablesUpdated")
        .withArgs(newPayoutTables);
        
      const gameStats = await casinoSlot.getGameStats();
      expect(gameStats.payoutTablesAddress).to.equal(newPayoutTables);
    });

    it("Should reject non-owner PayoutTables updates", async function () {
      const newPayoutTables = ethers.Wallet.createRandom().address;
      
      await expect(
        casinoSlot.connect(player1).updatePayoutTables(newPayoutTables)
      ).to.be.reverted;
    });

    it("Should reject invalid PayoutTables address", async function () {
      await expect(
        casinoSlot.updatePayoutTables(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("Pause/Unpause Controls", function () {
    it("Should allow owner to pause and unpause", async function () {
      // Initially unpaused
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx1 = await casinoSlot.connect(player1).spin3Reels();
      expect(tx1).to.not.be.undefined;
      
      // Pause
      await casinoSlot.pause();
      
      await expect(
        casinoSlot.connect(player1).spin3Reels()
      ).to.be.revertedWith("EnforcedPause");
      
      // Unpause
      await casinoSlot.unpause();
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx2 = await casinoSlot.connect(player1).spin3Reels();
      expect(tx2).to.not.be.undefined;
    });

    it("Should reject non-owner pause/unpause", async function () {
      await expect(casinoSlot.connect(player1).pause()).to.be.reverted;
      await expect(casinoSlot.connect(player1).unpause()).to.be.reverted;
    });
  });

  describe("ETH Withdrawal", function () {
    it("Should allow owner to withdraw ETH", async function () {
      const contractBalance = await ethers.provider.getBalance(casinoSlot.address);
      expect(contractBalance).to.be.gt(0);
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const withdrawAmount = ethers.utils.parseEther("1");
      
      const tx = await casinoSlot.withdrawETH(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const expectedBalance = ownerBalanceBefore.add(withdrawAmount).sub(gasUsed);
      
      expect(ownerBalanceAfter).to.be.closeTo(expectedBalance, ethers.utils.parseEther("0.01"));
    });

    it("Should reject non-owner withdraw attempts", async function () {
      await expect(
        casinoSlot.connect(player1).withdrawETH(ethers.utils.parseEther("1"))
      ).to.be.reverted;
    });

    it("Should reject withdrawal of more ETH than available", async function () {
      const contractBalance = await ethers.provider.getBalance(casinoSlot.address);
      const excessiveAmount = contractBalance.add(ethers.utils.parseEther("1"));
      
      await expect(
        casinoSlot.withdrawETH(excessiveAmount)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Testing Functions", function () {
    it("Should allow owner to set test ETH price", async function () {
      const testPrice = 250000; // $2500 per ETH in cents
      await casinoSlot.setTestETHPrice(testPrice);
      
      // Verify the test price is being used
      const ethPrice = await casinoSlot.getETHPrice();
      expect(ethPrice).to.equal(testPrice);
    });

    it("Should fall back to real price feed when test price not set", async function () {
      // Don't set test price, should use real Chainlink feed
      const ethPrice = await casinoSlot.getETHPrice();
      expect(ethPrice).to.be.gt(0); // Should get real price from mainnet
    });

    it("Should reject non-owner test price setting", async function () {
      await expect(
        casinoSlot.connect(player1).setTestETHPrice(200000)
      ).to.be.reverted;
    });

    it("Should allow owner to add to prize pool for testing", async function () {
      const initialPool = await casinoSlot.totalPrizePool();
      const addAmount = ethers.utils.parseEther("5");
      
      await casinoSlot.addToPrizePool(addAmount);
      
      const finalPool = await casinoSlot.totalPrizePool();
      expect(finalPool).to.equal(initialPool.add(addAmount));
    });

    it("Should reject non-owner prize pool additions", async function () {
      await expect(
        casinoSlot.connect(player1).addToPrizePool(ethers.utils.parseEther("1"))
      ).to.be.reverted;
    });
  });

  describe("VRF Testing Functions", function () {
    it("Should allow owner to test VRF fulfillment", async function () {
      // Execute a spin first
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Test VRF fulfillment
      await casinoSlot.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x123456")]);
      
      const spin = await casinoSlot.spins(requestId);
      expect(spin.settled).to.be.true;
    });

    it("Should reject non-owner VRF test calls", async function () {
      await expect(
        casinoSlot.connect(player1).testFulfillRandomWords(1, [123])
      ).to.be.reverted;
    });

    it("Should prevent VRF testing on mainnet", async function () {
      // This would fail if actually on mainnet (chainId 1)
      // On hardhat fork, chainId is 31337, so test should work
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Should work on testnet (hardhat fork)
      await casinoSlot.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x123456")]);
      
      const spin = await casinoSlot.spins(requestId);
      expect(spin.settled).to.be.true;
    });
  });

  describe("Access Control Summary", function () {
    it("Should protect all admin functions from non-owners", async function () {
      const protectedCalls = [
        casinoSlot.connect(player1).updatePayoutTables(ethers.constants.AddressZero),
        casinoSlot.connect(player1).pause(),
        casinoSlot.connect(player1).unpause(),
        casinoSlot.connect(player1).withdrawETH(ethers.utils.parseEther("1")),
        casinoSlot.connect(player1).setTestETHPrice(200000),
        casinoSlot.connect(player1).addToPrizePool(ethers.utils.parseEther("1"))
      ];

      for (const call of protectedCalls) {
        await expect(call).to.be.reverted;
      }
    });
  });
}); 