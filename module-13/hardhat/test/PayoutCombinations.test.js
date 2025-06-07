const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🎰 Payout Combinations", function () {
  let degenSlots, chipToken, payoutTables, payoutTables3;
  let mockVRFCoordinator, owner, player1;

  before(async function () {
    [owner, player1] = await ethers.getSigners();

    // Deploy TestToken for testing
    const TestToken = await ethers.getContractFactory("TestToken");
    chipToken = await TestToken.deploy(
      "Test Chips",
      "TCHIPS", 
      ethers.utils.parseEther("1000000")
    );
    await chipToken.deployed();

    // Deploy Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();

    // Use dummy addresses for Compound since mocking is built into DegenSlotsTest
    const dummyCEthAddress = ethers.Wallet.createRandom().address;
    const dummyComptrollerAddress = ethers.Wallet.createRandom().address;

    // Deploy PayoutTables contracts
    const PayoutTables3 = await ethers.getContractFactory("PayoutTables3");
    payoutTables3 = await PayoutTables3.deploy();
    await payoutTables3.deployed();

    const PayoutTables4 = await ethers.getContractFactory("PayoutTables4");
    const payoutTables4 = await PayoutTables4.deploy();
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

    // Deploy DegenSlotsTest with correct parameters
    const DegenSlotsTest = await ethers.getContractFactory("DegenSlotsTest");
    degenSlots = await upgrades.deployProxy(
      DegenSlotsTest,
      [
        1, // VRF subscription ID
        chipToken.address,
        ethers.constants.AddressZero, // Mock price feed
        payoutTables.address,
        mockVRFCoordinator.address,
        "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef", // keyHash
        dummyCEthAddress, // Dummy address - mocking is built into DegenSlotsTest
        dummyComptrollerAddress, // Dummy address - mocking is built into DegenSlotsTest
        owner.address // Initial owner
      ],
      { kind: "uups" }
    );
    await degenSlots.deployed();
  });

  // PayoutType enum mapping from IPayoutTables
  const PayoutType = {
    LOSE: 0,
    SMALL_WIN: 1,      // 2x
    MEDIUM_WIN: 2,     // 5x
    BIG_WIN: 3,        // 10x
    MEGA_WIN: 4,       // 50x
    ULTRA_WIN: 5,      // 100x
    SPECIAL_COMBO: 6,  // 20x (2 rockets)
    JACKPOT: 7         // 50% of pool
  };

  describe("Jackpot Combinations", function () {
    it("Should correctly identify jackpot combination 666", async function () {
      const payoutType = await payoutTables.getPayoutType(3, 666);
      expect(payoutType).to.equal(PayoutType.JACKPOT);
    });
  });

  describe("Ultra Win Combinations", function () {
    it("Should correctly identify triple rockets 555", async function () {
      const payoutType = await payoutTables.getPayoutType(3, 555);
      expect(payoutType).to.equal(PayoutType.ULTRA_WIN);
    });
  });

  describe("Mega Win Combinations", function () {
    it("Should correctly identify triple diamonds 444", async function () {
      const payoutType = await payoutTables.getPayoutType(3, 444);
      expect(payoutType).to.equal(PayoutType.MEGA_WIN);
    });
  });

  describe("Big Win Combinations", function () {
    it("Should correctly identify triple pumps 333", async function () {
      const payoutType = await payoutTables.getPayoutType(3, 333);
      expect(payoutType).to.equal(PayoutType.BIG_WIN);
    });
  });

  describe("Medium Win Combinations", function () {
    it("Should correctly identify triple copes 222", async function () {
      const payoutType = await payoutTables.getPayoutType(3, 222);
      expect(payoutType).to.equal(PayoutType.MEDIUM_WIN);
    });
  });

  describe("Special Combo - Two Rockets", function () {
    it("Should correctly identify two-rocket combinations", async function () {
      const twoRocketCombos = [551, 515, 155, 552, 525, 255];
      
      for (const combo of twoRocketCombos) {
        const payoutType = await payoutTables.getPayoutType(3, combo);
        expect(payoutType).to.equal(PayoutType.SPECIAL_COMBO);
      }
    });
  });

  describe("Small Win - Two Pairs", function () {
    it("Should correctly identify two diamond combinations", async function () {
      const twoDiamondCombos = [441, 414, 144, 442, 424, 244];
      
      for (const combo of twoDiamondCombos) {
        const payoutType = await payoutTables.getPayoutType(3, combo);
        expect(payoutType).to.equal(PayoutType.SMALL_WIN);
      }
    });

    it("Should correctly identify two pump combinations", async function () {
      const twoPumpCombos = [331, 313, 133, 332, 323, 233];
      
      for (const combo of twoPumpCombos) {
        const payoutType = await payoutTables.getPayoutType(3, combo);
        expect(payoutType).to.equal(PayoutType.SMALL_WIN);
      }
    });
  });

  describe("Losing Combinations", function () {
    it("Should correctly identify losing combinations", async function () {
      const losingCombos = [111, 123, 456, 146, 321];
      
      for (const combo of losingCombos) {
        const payoutType = await payoutTables.getPayoutType(3, combo);
        expect(payoutType).to.equal(PayoutType.LOSE);
      }
    });
  });

  describe("DegenSlots Integration", function () {
    it("Should use external payout tables correctly", async function () {
      const gameStats = await degenSlots.getGameStats();
      expect(gameStats.payoutTablesAddress).to.equal(payoutTables.address);
    });

    it("Should calculate payouts using external tables", async function () {
      // Setup CHIPS for testing
      await chipToken.transfer(player1.address, ethers.utils.parseEther("10"));
      await chipToken.connect(player1).approve(degenSlots.address, ethers.utils.parseEther("10"));
      
      // Request a spin
      const tx = await degenSlots.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Mock VRF response to generate specific combination
      await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x03030303")]); // Should generate 444
      
      const spin = await degenSlots.spins(requestId);
      expect(spin.settled).to.be.true;
      expect(spin.payoutType).to.equal(PayoutType.MEGA_WIN); // Triple diamonds
    });
  });
}); 