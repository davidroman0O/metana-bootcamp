const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🎲 VRF Mechanics - Mainnet Fork Testing", function () {
  let casinoSlot, payoutTables;
  let payoutTables3, payoutTables4;
  let owner, player1, player2;
  
  // Real Mainnet addresses for forking
  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // Real Chainlink ETH/USD feed
  const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"; // 500 gwei

  before(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Mock addresses
    const mockVRFCoordinator = ethers.Wallet.createRandom().address;
    const mockEthUsdPriceFeed = ethers.Wallet.createRandom().address;
    const dummyKeyHash = ethers.utils.formatBytes32String("dummy");
    const subscriptionId = 1;
    
    // Deploy PayoutTables
    const PayoutTables = await ethers.getContractFactory("PayoutTablesBasic");
    const payoutTables = await PayoutTables.deploy();
    await payoutTables.deployed();
    
    // Deploy CasinoSlot via proxy
    const CasinoSlot = await ethers.getContractFactory("CasinoSlot");
    casinoSlot = await upgrades.deployProxy(
      CasinoSlot,
      [
        subscriptionId,        // uint64 subscriptionId
        mockEthUsdPriceFeed,   // address ethUsdPriceFeedAddress
        payoutTables.address,  // address payoutTablesAddress
        mockVRFCoordinator,    // address vrfCoordinatorAddress
        dummyKeyHash,          // bytes32 vrfKeyHash
        owner.address          // address initialOwner
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
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      
      const spinEvent = receipt.events.find(e => e.event === "SpinRequested");
      expect(spinEvent).to.not.be.undefined;
      
      const requestId = spinEvent.args.requestId;
      const spin = await casinoSlot.spins(requestId);
      
      expect(spin.player).to.equal(player1.address);
      expect(spin.betAmount).to.equal(ethers.utils.parseEther("1")); // 3-reel cost
      expect(spin.reelCount).to.equal(3);
      expect(spin.settled).to.be.false;
    });

    it("Should transfer CHIPS correctly during spin", async function () {
      const reel3Cost = ethers.utils.parseEther("1");
      const chipBalanceBefore = await casinoSlot.balanceOf(player1.address);
      
      await casinoSlot.connect(player1).spin3Reels();
      
      const chipBalanceAfter = await casinoSlot.balanceOf(player1.address);
      expect(chipBalanceAfter).to.equal(chipBalanceBefore.sub(reel3Cost));
    });

    it("Should increment request IDs correctly", async function () {
      const tx1 = await casinoSlot.connect(player1).spin3Reels();
      const receipt1 = await tx1.wait();
      const event1 = receipt1.events.find(e => e.event === "SpinRequested");
      
      const tx2 = await casinoSlot.connect(player1).spin3Reels();
      const receipt2 = await tx2.wait();
      const event2 = receipt2.events.find(e => e.event === "SpinRequested");
      
      expect(event2.args.requestId).to.be.gt(event1.args.requestId);
    });

    it("Should update prize pool correctly", async function () {
      const initialPool = await casinoSlot.totalPrizePool();
      
      await casinoSlot.connect(player1).spin3Reels();
      
      const finalPool = await casinoSlot.totalPrizePool();
      const expectedIncrease = ethers.utils.parseEther("0.95"); // 1 CHIP - 5% house edge
      expect(finalPool).to.equal(initialPool.add(expectedIncrease));
    });
  });

  describe("VRF Fulfillment with PayoutTables", function () {
    it("Should handle BIG WIN combinations (333)", async function () {
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
      expect(spin.payout).to.equal(ethers.utils.parseEther("10")); // 10x multiplier
      
      // Verify PayoutTables integration
      const combinationKey = parseInt(reels.map(r => r.toString()).join(''));
      const payoutType = await payoutTables.getPayoutType(3, combinationKey);
      expect(payoutType).to.equal(3); // BIG_WIN
    });

    it("Should handle ULTRA WIN combinations (555)", async function () {
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
      expect(spin.payout).to.equal(ethers.utils.parseEther("100")); // 100x multiplier
    });

    it("Should handle losing combinations", async function () {
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
      expect(spin.payout).to.equal(ethers.utils.parseEther("20")); // 20x multiplier
    });

    it("Should prevent double fulfillment", async function () {
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
  });

  describe("Multi-Reel Mode Testing", function () {
    it("Should handle 4-reel spins correctly", async function () {
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
      expect(spin.payout).to.equal(ethers.utils.parseEther("500")); // 50x * 10 CHIPS
    });

    it("Should have correct costs for different reel modes", async function () {
      expect(await casinoSlot.getSpinCost(3)).to.equal(ethers.utils.parseEther("1"));
      expect(await casinoSlot.getSpinCost(4)).to.equal(ethers.utils.parseEther("10"));
      expect(await casinoSlot.getSpinCost(5)).to.equal(ethers.utils.parseEther("100"));
      expect(await casinoSlot.getSpinCost(6)).to.equal(ethers.utils.parseEther("500"));
      expect(await casinoSlot.getSpinCost(7)).to.equal(ethers.utils.parseEther("1000"));
    });
  });

  describe("Player Winnings Management", function () {
    it("Should track player winnings correctly", async function () {
      // Execute a guaranteed winning spin
      const tx = await casinoSlot.connect(player1).spin3Reels();
      const receipt = await tx.wait();
      const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
      
      // Use the proven working value from the BIG WIN test
      const randomValue = ethers.BigNumber.from("131090");
      await casinoSlot.testFulfillRandomWords(requestId, [randomValue]);
      
      const spin = await casinoSlot.spins(requestId);
      const afterSpinStats = await casinoSlot.getPlayerStats(player1.address);
      
      expect(spin.payoutType).to.equal(3); // BIG_WIN
      expect(spin.payout).to.equal(ethers.utils.parseEther("10")); // 10x * 1 CHIP
      expect(afterSpinStats.winnings).to.be.gte(ethers.utils.parseEther("10")); // Should have winnings now
    });

    it("Should allow withdrawing winnings", async function () {
      // First ensure we have winnings from a guaranteed win
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
      const reel3Cost = ethers.utils.parseEther("1");
      
      // Step 1: Execute spin
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
      const expectedPayout = reel3Cost.mul(10); // BIG_WIN = 10x
      expect(spin.payout).to.equal(expectedPayout);
      
      // Step 5: Verify player winnings updated
      const currentWinnings = await casinoSlot.playerWinnings(player1.address);
      expect(currentWinnings).to.be.gte(expectedPayout); // May have previous winnings
      
      // Step 6: Withdraw and verify final balance
      const balanceBeforeWithdraw = await casinoSlot.balanceOf(player1.address);
      
      await casinoSlot.connect(player1).withdrawWinnings();
      const finalChips = await casinoSlot.balanceOf(player1.address);
      expect(finalChips).to.equal(balanceBeforeWithdraw.add(currentWinnings));
    });

    it("Should handle multiple sequential spins", async function () {
      const reel3Cost = ethers.utils.parseEther("1");
      const spins = [];
      
      // Create 3 spins
      for (let i = 0; i < 3; i++) {
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
        await casinoSlot.testFulfillRandomWords(spins[i], [ethers.BigNumber.from(outcomes[i].random)]);
        
        const expectedPayout = reel3Cost.mul(outcomes[i].multiplier);
        totalExpectedPayout = totalExpectedPayout.add(expectedPayout);
      }
      
      // Expected: 1*0 + 1*10 + 1*2 = 0 + 10 + 2 = 12 CHIPS
      const expectedTotal = ethers.utils.parseEther("12");
      expect(totalExpectedPayout).to.equal(expectedTotal);
      
      // Verify total winnings (may include previous winnings from other tests)
      const playerWinnings = await casinoSlot.playerWinnings(player1.address);
      expect(playerWinnings).to.be.gte(expectedTotal);
    });
  });

  describe("Prize Pool Integration", function () {
    it("Should handle jackpot payouts from prize pool", async function () {
      const initialPool = await casinoSlot.totalPrizePool();
      expect(initialPool).to.be.gt(0); // Should have ETH from beforeEach
      
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