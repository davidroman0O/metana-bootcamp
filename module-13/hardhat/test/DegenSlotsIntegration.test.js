const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("DegenSlots Integration", function () {
    let degenSlots, payoutTables, payoutTables3, payoutTables4;
    let chipToken, mockVRFCoordinator;
    let owner, player1, player2;

    // Real Mainnet addresses for forking
    const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // Real Chainlink ETH/USD feed
    const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"; // 500 gwei

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Deploy TestToken for testing
        const TestToken = await ethers.getContractFactory("TestToken");
        chipToken = await TestToken.deploy(
            "Test Chips",
            "TCHIPS", 
            ethers.utils.parseEther("1000000") // 1M initial supply
        );
        await chipToken.deployed();

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

        // Setup CHIPS for players
        await chipToken.transfer(player1.address, ethers.utils.parseEther("1000"));
        await chipToken.transfer(player2.address, ethers.utils.parseEther("1000"));
        
        // Approve degenSlots to spend CHIPS
        await chipToken.connect(player1).approve(degenSlots.address, ethers.utils.parseEther("1000"));
        await chipToken.connect(player2).approve(degenSlots.address, ethers.utils.parseEther("1000"));
    });

    describe("DegenSlots → PayoutTables Integration", function () {
        it("should integrate with PayoutTables correctly", async function () {
            const gameStats = await degenSlots.getGameStats();
            expect(gameStats.payoutTablesAddress).to.equal(payoutTables.address);
        });

        it("should calculate payouts using external tables", async function () {
            // Request a 3-reel spin
            const tx = await degenSlots.connect(player1).spin3Reels();
            const receipt = await tx.wait();
            
            // Get the request ID from the event
            const spinRequestedEvent = receipt.events.find(e => e.event === "SpinRequested");
            const requestId = spinRequestedEvent.args.requestId;

            // Mock the VRF response - this generates [1,5,3] which is a losing combination
            await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("131586")]);

            // Check the spin result
            const spin = await degenSlots.spins(requestId);
            const reels = await degenSlots.getSpinReels(requestId);
            
            expect(spin.settled).to.be.true;
            expect(spin.player).to.equal(player1.address);
            expect(spin.reelCount).to.equal(3);
            expect(spin.payoutType).to.equal(0); // LOSE - which is correct for [1,5,3]
            expect(spin.payout).to.equal(0); // No payout for losing combination
        });
        
        it("should handle winning combinations correctly", async function () {
            // Request a 3-reel spin
            const tx = await degenSlots.connect(player1).spin3Reels();
            const receipt = await tx.wait();
            
            const spinRequestedEvent = receipt.events.find(e => e.event === "SpinRequested");
            const requestId = spinRequestedEvent.args.requestId;

            // Use the same randomness as the working 4-reel test: generates winning combo
            await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x03030303")]);

            // Check the spin result
            const spin = await degenSlots.spins(requestId);
            const reels = await degenSlots.getSpinReels(requestId);
            
            expect(spin.settled).to.be.true;
            expect(spin.player).to.equal(player1.address);
            expect(spin.reelCount).to.equal(3);
            // Should be a winning combination (exact type depends on generated reels)
            expect(spin.payoutType).to.be.greaterThan(0);
            expect(spin.payout.gt(0)).to.be.true;
        });

        it("should support different reel modes with correct costs", async function () {
            // Check spin costs
            expect(await degenSlots.getSpinCost(3)).to.equal(ethers.utils.parseEther("1"));      // 1 CHIPS
            expect(await degenSlots.getSpinCost(4)).to.equal(ethers.utils.parseEther("10"));     // 10 CHIPS
            expect(await degenSlots.getSpinCost(5)).to.equal(ethers.utils.parseEther("100"));    // 100 CHIPS
            expect(await degenSlots.getSpinCost(6)).to.equal(ethers.utils.parseEther("500"));    // 500 CHIPS
            expect(await degenSlots.getSpinCost(7)).to.equal(ethers.utils.parseEther("1000"));   // 1000 CHIPS
        });

        it("should handle 4-reel spins correctly", async function () {
            // Request a 4-reel spin
            const tx = await degenSlots.connect(player1).spin4Reels();
            const receipt = await tx.wait();
            
            const spinRequestedEvent = receipt.events.find(e => e.event === "SpinRequested");
            const requestId = spinRequestedEvent.args.requestId;

            // Mock the VRF response to generate [4,4,4,4] reels (all diamonds)
            await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x03030303")]);

            // Check the spin result
            const spin = await degenSlots.spins(requestId);
            const reels = await degenSlots.getSpinReels(requestId);
            
            expect(spin.settled).to.be.true;
            expect(spin.reelCount).to.equal(4);
            expect(spin.payoutType).to.equal(4); // MEGA_WIN
            expect(spin.payout).to.equal(ethers.utils.parseEther("500")); // 50x bet amount (10 CHIPS)
        });

        it("should handle losing combinations", async function () {
            // Request a 3-reel spin
            const tx = await degenSlots.connect(player1).spin3Reels();
            const receipt = await tx.wait();
            
            const spinRequestedEvent = receipt.events.find(e => e.event === "SpinRequested");
            const requestId = spinRequestedEvent.args.requestId;

            // Mock the VRF response with a losing combination (123)
            await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x020100")]);

            // Check the spin result
            const spin = await degenSlots.spins(requestId);
            const reels = await degenSlots.getSpinReels(requestId);
            
            expect(spin.settled).to.be.true;
            expect(spin.payoutType).to.equal(0); // LOSE
            expect(spin.payout).to.equal(0); // No payout
        });

        it("should manage prize pool correctly", async function () {
            // Spin and lose (to add to prize pool)
            const tx = await degenSlots.connect(player1).spin3Reels();
            const receipt = await tx.wait();
            const requestId = receipt.events.find(e => e.event === "SpinRequested").args.requestId;
            
            // Mock losing spin
            await degenSlots.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x020100")]);
            
            // Prize pool should have increased (cost minus house edge)
            const prizePool = await degenSlots.totalPrizePool();
            const expectedIncrease = ethers.utils.parseEther("0.95"); // 1 CHIP - 5% house edge
            expect(prizePool).to.equal(expectedIncrease);
        });
    });

    describe("Admin Functions", function () {
        it("should allow owner to update PayoutTables address", async function () {
            const newPayoutTables = ethers.Wallet.createRandom().address;
            
            await expect(degenSlots.updatePayoutTables(newPayoutTables))
                .to.emit(degenSlots, "PayoutTablesUpdated")
                .withArgs(newPayoutTables);
                
            const gameStats = await degenSlots.getGameStats();
            expect(gameStats.payoutTablesAddress).to.equal(newPayoutTables);
        });

        it("should not allow non-owner to update PayoutTables", async function () {
            const newPayoutTables = ethers.Wallet.createRandom().address;
            
            await expect(degenSlots.connect(player1).updatePayoutTables(newPayoutTables))
                .to.be.reverted; // Simple revert check
        });
    });
}); 