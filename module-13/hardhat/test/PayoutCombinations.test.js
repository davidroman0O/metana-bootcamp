const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🎯 Payout Combinations Testing", function () {
  let casinoSlot, mockVRFCoordinator;
  let payoutTables, payoutTables3, payoutTables4;
  let owner, player1;

  // PayoutType enum mapping for JavaScript tests (matches IPayoutTables.sol)
  const PayoutType = {
    LOSE: 0,
    SMALL_WIN: 1,      // 2x
    MEDIUM_WIN: 2,     // 5x
    BIG_WIN: 3,        // 10x
    MEGA_WIN: 4,       // 50x
    ULTRA_WIN: 5,      // 100x
    SPECIAL_COMBO: 6,  // 20x
    JACKPOT: 7         // 25% of pool
  };

  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const LINK_USD_PRICE_FEED = "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c";
  const LINK_TOKEN = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
  const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const dummyKeyHash = ethers.utils.formatBytes32String("dummy");
  const subscriptionId = 1;

  before(async function () {
    [owner, player1] = await ethers.getSigners();

    // Deploy Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();

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

    // Deploy CasinoSlotTest with correct parameters
    const CasinoSlotTest = await ethers.getContractFactory("CasinoSlotTest");
    casinoSlot = await upgrades.deployProxy(
      CasinoSlotTest,
      [
        subscriptionId,
        ETH_USD_PRICE_FEED,
        LINK_USD_PRICE_FEED,
        LINK_TOKEN,
        payoutTables.address,
        mockVRFCoordinator.address,
        UNISWAP_V3_ROUTER,
        WETH_TOKEN,
        dummyKeyHash,
        owner.address // Initial owner
      ],
      { kind: "uups" }
    );
    await casinoSlot.deployed();
  });

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

  describe("CasinoSlot Integration", function () {
    it("Should use external payout tables correctly", async function () {
      const gameStats = await casinoSlot.getGameStats();
      expect(gameStats.payoutTablesAddress).to.equal(payoutTables.address);
    });

    it("Should calculate payouts using external tables", async function () {
      // Buy CHIPS for testing
      await casinoSlot.connect(player1).buyChips({ value: ethers.utils.parseEther("1") });
      
      // Request a spin
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Mock VRF response to generate specific combination
      await casinoSlot.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x03030303")]); // Should generate 444
      
      const spin = await casinoSlot.spins(requestId);
      expect(spin.settled).to.be.true;
      expect(spin.payoutType).to.equal(PayoutType.MEGA_WIN); // Triple diamonds
    });
  });
}); 