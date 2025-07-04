const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🎲 VRF Mechanics - Mainnet Fork Testing", function () {
  let casinoSlot, payoutTables;
  let payoutTables3, payoutTables4;
  let owner, player1, player2;
  
  // Real Mainnet addresses for forking
  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const LINK_USD_PRICE_FEED = "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c";
  const LINK_TOKEN = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
  const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const CHAINLINK_KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"; // VRF v2.5 key hash

  before(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();

    // Deploy PayoutTables contracts
    const PayoutTables3 = await ethers.getContractFactory("PayoutTables3");
    const payoutTables3 = await PayoutTables3.deploy();
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
    
    // Deploy CasinoSlotTest via proxy
    const CasinoSlotTest = await ethers.getContractFactory("CasinoSlotTest");
    casinoSlot = await upgrades.deployProxy(
      CasinoSlotTest,
      [
        ethers.BigNumber.from("123456789"), // VRF v2.5 subscription ID (uint256)
        ETH_USD_PRICE_FEED,       // address ethUsdPriceFeedAddress
        LINK_USD_PRICE_FEED,      // address linkUsdPriceFeedAddress
        LINK_TOKEN,               // address linkTokenAddress
        payoutTables.address,     // address payoutTablesAddress
        mockVRFCoordinator.address, // address vrfCoordinatorAddress
        UNISWAP_V3_ROUTER,        // address uniswapRouterAddress
        WETH_TOKEN,               // address wethTokenAddress
        CHAINLINK_KEY_HASH,       // bytes32 vrfKeyHash (v2.5)
        owner.address             // address initialOwner
      ],
      {
        kind: 'uups',
        initializer: 'initialize'
      }
    );

    // Add ETH to contract for payouts (one time)
    await owner.sendTransaction({
      to: casinoSlot.address,
      value: ethers.utils.parseEther("100") // Reduced amount
    });
  });

  beforeEach(async function () {
    // Reset any accumulated winnings to ensure test isolation
    const player1Winnings = await casinoSlot.playerWinnings(player1.address);
    const player2Winnings = await casinoSlot.playerWinnings(player2.address);
    
    if (player1Winnings.gt(0)) {
      await casinoSlot.connect(player1).withdrawWinnings();
    }
    if (player2Winnings.gt(0)) {
      await casinoSlot.connect(player2).withdrawWinnings();
    }
    
    // Give players chips using the buyChips function
    const player1Balance = await casinoSlot.balanceOf(player1.address);
    const player2Balance = await casinoSlot.balanceOf(player2.address);
    
    // Only top up if needed (more efficient)
    if (player1Balance.lt(ethers.utils.parseEther("1000"))) {
      await casinoSlot.connect(player1).buyChips({ value: ethers.utils.parseEther("1") }); // Buy chips with 1 ETH
    }
    if (player2Balance.lt(ethers.utils.parseEther("1000"))) {
      await casinoSlot.connect(player2).buyChips({ value: ethers.utils.parseEther("1") }); // Buy chips with 1 ETH
    }
  });

  describe("Spin Request Mechanism", function () {
    it("Should store spin data correctly when requesting", async function () {
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      
      const spinEvent = receipt.events.find(e => e.event === "SpinRequested");
      expect(spinEvent).to.not.be.undefined;
      
      const requestId = spinEvent.args.requestId;
      const spin = await casinoSlot.spins(requestId);
      
      expect(spin.player).to.equal(player1.address);
      expect(spin.betAmount).to.be.gt(0); // Dynamic cost
      expect(spin.reelCount).to.equal(3);
      expect(spin.settled).to.be.false;
    });

    it("Should transfer CHIPS correctly during spin", async function () {
      const reel3Cost = await casinoSlot.getSpinCost(3);
      const chipBalanceBefore = await casinoSlot.balanceOf(player1.address);
      
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      await casinoSlot.connect(player1).spin3Reels();
      
      const chipBalanceAfter = await casinoSlot.balanceOf(player1.address);
      expect(chipBalanceAfter).to.equal(chipBalanceBefore.sub(reel3Cost));
    });

    it("Should increment request IDs correctly", async function () {
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx1 = await casinoSlot.connect(player1).spin3Reels();
      const receipt1 = await tx1.wait();
      const event1 = receipt1.events.find(e => e.event === "SpinRequested");
      
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx2 = await casinoSlot.connect(player1).spin3Reels();
      const receipt2 = await tx2.wait();
      const event2 = receipt2.events.find(e => e.event === "SpinRequested");
      
      expect(event2.args.requestId).to.be.gt(event1.args.requestId);
    });

    it("Should update prize pool correctly", async function () {
      const initialPool = await casinoSlot.totalPrizePool();
      
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      await casinoSlot.connect(player1).spin3Reels();
      
      const finalPool = await casinoSlot.totalPrizePool();
      expect(finalPool).to.be.gt(initialPool);
    });
  });

  describe("VRF Fulfillment with PayoutTables", function () {
    it("Should handle BIG WIN combinations (333)", async function () {
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "SpinRequested");
      const requestId = event.args.requestId;
      
      // From empirical testing: need to find a value that produces [3,3,3]
      // Try 131090 (131088 gives [1,3,3], so add 2 to get [3,3,3])
      const randomValue = ethers.BigNumber.from("131090");
      
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const spin = await casinoSlot.spins(requestId);
      const reels = await casinoSlot.getSpinReels(requestId);
      
      console.log("BIG WIN test - reels:", reels.map(r => r.toString()), "payoutType:", spin.payoutType.toString());
      expect(spin.settled).to.be.true;
      expect(spin.payoutType).to.equal(3); // BIG_WIN
      expect(spin.payout).to.be.gt(0);
      
      // Verify PayoutTables integration
      const combinationKey = parseInt(reels.map(r => r.toString()).join(''));
      const payoutType = await payoutTables.getPayoutType(3, combinationKey);
      expect(payoutType).to.equal(3); // BIG_WIN
    });

    it("Should handle ULTRA WIN combinations (555)", async function () {
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "SpinRequested");
      const requestId = event.args.requestId;
      
      // Use the discovered working value for [5,5,5]
      const randomValue = ethers.BigNumber.from("262246");
      
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const spin = await casinoSlot.spins(requestId);
      const reels = await casinoSlot.getSpinReels(requestId);
      console.log("ULTRA WIN test - reels:", reels.map(r => r.toString()), "payoutType:", spin.payoutType.toString());
      
      expect(spin.settled).to.be.true;
      expect(spin.payoutType).to.equal(5); // ULTRA_WIN
      expect(spin.payout).to.be.gt(0);
    });

    it("Should handle losing combinations", async function () {
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "SpinRequested");
      const requestId = event.args.requestId;
      
      // Generate [1,2,3] losing combination - use value that gives mixed reels
      const randomValue = ethers.BigNumber.from("131328");
      
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const spin = await casinoSlot.spins(requestId);
      expect(spin.settled).to.be.true;
      expect(spin.payoutType).to.equal(0); // LOSE
      expect(spin.payout).to.equal(0);
    });

    it("Should handle SPECIAL_COMBO (two rockets)", async function () {
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "SpinRequested");
      const requestId = event.args.requestId;
      
      // Use the discovered working value for [5,5,1]
      const randomValue = ethers.BigNumber.from("1150");
      
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const spin = await casinoSlot.spins(requestId);
      const reels = await casinoSlot.getSpinReels(requestId);
      console.log("SPECIAL_COMBO test - reels:", reels.map(r => r.toString()), "payoutType:", spin.payoutType.toString());
      
      expect(spin.settled).to.be.true;
      expect(spin.payoutType).to.equal(6); // SPECIAL_COMBO
      expect(spin.payout).to.be.gt(0);
    });

    it("Should prevent double fulfillment", async function () {
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "SpinRequested");
      const requestId = event.args.requestId;
      
      const randomValue = ethers.BigNumber.from("0x123456");
      
      // First fulfillment should work
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      // Second fulfillment should fail
      await expect(
        casinoSlot.testFulfillRandomWords(requestId, [randomValue])
      ).to.be.revertedWith("Spin already settled");
    });

    it("Should handle jackpot payouts from prize pool", async function () {
      const initialPool = await casinoSlot.totalPrizePool();
      expect(initialPool).to.be.gt(0); // Should have ETH from beforeEach
      
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Prize pool after the spin (which adds to it)
      const poolAfterSpin = await casinoSlot.totalPrizePool();
      
      // Use the discovered working value for [6,6,6]
      const randomValue = ethers.BigNumber.from("328463");
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const spin = await casinoSlot.spins(requestId);
      const reels = await casinoSlot.getSpinReels(requestId);
      console.log("JACKPOT test - reels:", reels.map(r => r.toString()), "payoutType:", spin.payoutType.toString());
      
      expect(spin.payoutType).to.equal(7); // JACKPOT
      
      // Jackpot should be 25% of prize pool at the time of the spin (updated from 50% for security)
      const expectedJackpot = poolAfterSpin.div(4); // Changed from div(2) to div(4) = 25%
      // Increased tolerance to account for prize pool fluctuations from other tests
      expect(spin.payout).to.be.closeTo(expectedJackpot, ethers.utils.parseEther("1.0"));
      
      const finalPool = await casinoSlot.totalPrizePool();
      expect(finalPool).to.be.lt(poolAfterSpin);
    });
  });

  describe("Multi-Reel Mode Testing", function () {
    it("Should handle 4-reel spins correctly", async function () {
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin4Reels();
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "SpinRequested");
      const requestId = event.args.requestId;
      
      // Generate [4,4,4,4] - all diamonds
      // For 4: need (value >> shift) % 6 = 3, then +1 = 4
      // Use 3 + (3<<8) + (3<<16) + (3<<24) = 3 + 768 + 196608 + 50331648 = 50529027
      const randomValue = ethers.BigNumber.from("50529027");
      
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const spin = await casinoSlot.spins(requestId);
      const reels = await casinoSlot.getSpinReels(requestId);
      
      expect(spin.settled).to.be.true;
      expect(spin.reelCount).to.equal(4);
      expect(reels.length).to.equal(4);
      expect(spin.payoutType).to.equal(4); // MEGA_WIN
      expect(spin.payout).to.be.gt(0);
    });

    it("Should have correct costs for different reel modes", async function () {
      const ethPrice = 2000 * 100; // $2000 in cents, matching test setup
      await casinoSlot.setTestETHPrice(ethPrice);

      const linkPrice = 14 * 100; // $14 in cents
      await casinoSlot.setTestLINKPrice(linkPrice);

      // Example for 3 reels
      const cost3 = await casinoSlot.getSpinCost(3);
      console.log(`Dynamic 3-reel cost: ${ethers.utils.formatEther(cost3)} CHIPS`);
      expect(cost3).to.be.gt(0);

      // Example for 7 reels
      const cost7 = await casinoSlot.getSpinCost(7);
      console.log(`Dynamic 7-reel cost: ${ethers.utils.formatEther(cost7)} CHIPS`);
      expect(cost7).to.be.gt(cost3);
    });
  });

  describe("Player Winnings Management", function () {
    it("Should track player winnings correctly", async function () {
      // Execute a guaranteed winning spin
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Use the proven working value from the BIG WIN test
      const randomValue = ethers.BigNumber.from("131090");
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const spin = await casinoSlot.spins(requestId);
      const afterSpinStats = await casinoSlot.getPlayerStats(player1.address);
      
      expect(spin.payoutType).to.equal(3); // BIG_WIN
      expect(spin.payout).to.be.gt(0);
      expect(afterSpinStats.winnings).to.be.gte(spin.payout);
    });

    it("Should allow withdrawing winnings", async function () {
      // First ensure we have winnings from a guaranteed win
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Use proven working value
      const randomValue = ethers.BigNumber.from("131090");
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const winningsBefore = await casinoSlot.playerWinnings(player1.address);
      expect(winningsBefore).to.be.gt(0);
      
      const initialBalance = await casinoSlot.balanceOf(player1.address);
      
      await casinoSlot.connect(player1).withdrawWinnings();
      
      const finalBalance = await casinoSlot.balanceOf(player1.address);
      expect(finalBalance).to.equal(initialBalance.add(winningsBefore));
      
      const finalWinnings = await casinoSlot.playerWinnings(player1.address);
      expect(finalWinnings).to.equal(0);
    });
  });

  describe("Complete Workflow Testing", function () {
    it("Should execute complete spin-to-payout workflow", async function () {
      const initialChips = await casinoSlot.balanceOf(player1.address);
      const reel3Cost = await casinoSlot.getSpinCost(3);
      
      // Step 1: Execute spin
      await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Step 2: Verify chips were deducted
      const afterSpinChips = await casinoSlot.balanceOf(player1.address);
      expect(afterSpinChips).to.equal(initialChips.sub(reel3Cost));
      
      // Step 3: Fulfill VRF with proven working combination
      const randomValue = ethers.BigNumber.from("131090");
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      // Step 4: Verify payout
      const spin = await casinoSlot.spins(requestId);
      expect(spin.payout).to.be.gt(0);
      
      // Step 5: Verify player winnings updated
      const currentWinnings = await casinoSlot.playerWinnings(player1.address);
      expect(currentWinnings).to.be.gte(spin.payout);
      
      // Step 6: Withdraw and verify final balance
      const balanceBeforeWithdraw = await casinoSlot.balanceOf(player1.address);
      
      await casinoSlot.connect(player1).withdrawWinnings();
      const finalChips = await casinoSlot.balanceOf(player1.address);
      expect(finalChips).to.equal(balanceBeforeWithdraw.add(currentWinnings));
    });

    it("Should handle multiple sequential spins", async function () {
      const reel3Cost = await casinoSlot.getSpinCost(3);
      const spins = [];
      
      // Create 3 spins
      for (let i = 0; i < 3; i++) {
        await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
        const tx = await casinoSlot.connect(player1).spin3Reels();
        const receipt = await tx.wait();
        const event = receipt.events.find(e => e.event === "SpinRequested");
        spins.push(event.args.requestId);
      }
      
      // Fulfill with proven working outcomes
      const outcomes = [
        { random: "131328", multiplier: 0, desc: "LOSE [1,2,3]" },      
        { random: "131090", multiplier: 10, desc: "BIG_WIN [3,3,3]" },  // Use proven working value
        { random: "66049", multiplier: 2, desc: "SMALL_WIN [2,1,2]" }   // Use proven working value from other test
      ];
      
      let totalExpectedPayout = ethers.BigNumber.from(0);
      
      for (let i = 0; i < spins.length; i++) {
        await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
        await casinoSlot.testFulfillRandomWords(spins[i], [ethers.BigNumber.from(outcomes[i].random)]);
        
        const spinResult = await casinoSlot.spins(spins[i]);
        const cost = await casinoSlot.getSpinCost(3);
        const expectedPayout = cost.mul(outcomes[i].multiplier);
        totalExpectedPayout = totalExpectedPayout.add(expectedPayout);
      }
      
      // Expected: Dynamic calculation
      const playerWinnings = await casinoSlot.playerWinnings(player1.address);
      expect(playerWinnings).to.be.gte(totalExpectedPayout);
    });
  });

  describe("Comprehensive Payout Testing", function () {
    it("Should systematically find all 3-reel winning combinations", async function () {
      const winningCombos = [];
      
      // Test all possible 3-reel combinations (1-6 for each reel)
      for (let r1 = 1; r1 <= 6; r1++) {
        for (let r2 = 1; r2 <= 6; r2++) {
          for (let r3 = 1; r3 <= 6; r3++) {
            const combinationKey = parseInt(`${r1}${r2}${r3}`);
            const payoutType = await payoutTables.getPayoutType(3, combinationKey);
            
            if (payoutType > 0) { // Not LOSE
              winningCombos.push({
                reels: [r1, r2, r3],
                combinationKey,
                payoutType: payoutType.toString(),
                payoutName: ['LOSE', 'SMALL_WIN', 'MEDIUM_WIN', 'BIG_WIN', 'MEGA_WIN', 'ULTRA_WIN', 'SPECIAL_COMBO', 'JACKPOT'][payoutType]
              });
            }
          }
        }
      }
      
      console.log("\n=== 3-REEL WINNING COMBINATIONS ===");
      winningCombos.forEach(combo => {
        console.log(`[${combo.reels.join(',')}] -> ${combo.payoutName} (${combo.payoutType})`);
      });
      
      expect(winningCombos.length).to.be.gt(0, "Should have at least some winning combinations");
    });
    
    it("Should find a working winning combination and test VRF integration", async function () {
      // From the comprehensive test, we know [2,2,2] is MEDIUM_WIN
      // Let's systematically find a random value that produces [2,2,2]
      
      let foundWinner = false;
      let winnerValue = null;
      let winnerReels = null;
      
      // Try values systematically - we know some patterns from the output
      const testValues = [1, 257, 513, 65793, 66049, 131329, 197121]; // Strategic values based on bit patterns
      
      for (const testValue of testValues) {
        await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
        const tx = await casinoSlot.connect(player1).spin3Reels();
        const receipt = await tx.wait();
        const event = receipt.events.find(e => e.event === "SpinRequested");
        const requestId = event.args.requestId;
        
        await casinoSlot.testFulfillRandomWords(requestId, [ethers.BigNumber.from(testValue)]);
        const reels = await casinoSlot.getSpinReels(requestId);
        const combinationKey = parseInt(reels.map(r => r.toString()).join(''));
        const payoutType = await payoutTables.getPayoutType(3, combinationKey);
        
        if (payoutType > 0) { // Found a winner!
          const spin = await casinoSlot.spins(requestId);
          
          console.log(`✓ WINNER FOUND!`);
          console.log(`Random value: ${testValue}`);
          console.log(`Reels: [${reels.join(',')}]`);
          console.log(`PayoutTables result: ${payoutType}`);
          console.log(`Contract PayoutType: ${spin.payoutType}`);
          console.log(`Payout: ${ethers.utils.formatEther(spin.payout)} CHIPS`);
          
          // Test the full integration
          expect(spin.settled).to.be.true;
          expect(spin.payoutType).to.equal(payoutType);
          expect(spin.payout).to.be.gt(0);
          
          // Test player winnings
          const playerStats = await casinoSlot.getPlayerStats(player1.address);
          expect(playerStats.winnings).to.be.gt(0);
          
          foundWinner = true;
          break;
        }
      }
      
      expect(foundWinner).to.equal(true, "Should find at least one winning combination");
    });
  });
}); 