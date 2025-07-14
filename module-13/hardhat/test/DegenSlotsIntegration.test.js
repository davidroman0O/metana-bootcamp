const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CasinoSlot Integration", function () {
    let casinoSlot, payoutTables, payoutTables3, payoutTables4;
    let owner, player1, player2;

    // Real mainnet addresses for mainnet fork testing
    const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    const LINK_USD_PRICE_FEED = "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c";
    const LINK_TOKEN = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
    const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
    const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const CHAINLINK_KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"; // VRF v2.5 key hash

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Deploy Mock VRF Coordinator 
        const MockVRFCoordinator = await ethers.getContractFactory("contracts/MockVRFCoordinator.sol:MockVRFCoordinator");
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

        // Deploy with upgradeable proxy with new 4-parameter constructor
        const CasinoSlotTest = await ethers.getContractFactory("CasinoSlotTest");
        casinoSlot = await upgrades.deployProxy(
            CasinoSlotTest,
            [
                ETH_USD_PRICE_FEED, // address ethUsdPriceFeedAddress
                payoutTables.address, // address payoutTablesAddress
                mockVRFCoordinator.address, // address wrapperAddress (VRF wrapper)
                owner.address // address initialOwner
            ],
            { kind: "uups" }
        );
        await casinoSlot.deployed();

        // Setup CHIPS for players by buying chips
        await casinoSlot.connect(player1).buyChips({ value: ethers.utils.parseEther("1") });
        await casinoSlot.connect(player2).buyChips({ value: ethers.utils.parseEther("1") });
    });

    describe("CasinoSlot → PayoutTables Integration", function () {
        it("should integrate with PayoutTables correctly", async function () {
            const gameStats = await casinoSlot.getGameStats();
            expect(gameStats.payoutTablesAddress).to.equal(payoutTables.address);
        });

        it("should calculate payouts using external tables", async function () {
            // Request a 3-reel spin
            await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
            const tx = await casinoSlot.connect(player1).spinReels(3);
            const receipt = await tx.wait();
            
            // Get the request ID from the event
            const spinRequestedEvent = receipt.events.find(e => e.event === "SpinInitiated");
            const requestId = spinRequestedEvent.args.requestId;

            // Mock the VRF response - this generates [1,5,3] which is a losing combination
            await casinoSlot.testFulfillRandomWords(requestId, [ethers.BigNumber.from("131586")]);

            // Check the spin result
            const spin = await casinoSlot.spins(requestId);
            const reels = await casinoSlot.getSpinReels(requestId);
            
            expect(spin.settled).to.be.true;
            expect(spin.player).to.equal(player1.address);
            expect(spin.reelCount).to.equal(3);
            expect(spin.payoutType).to.equal(0); // LOSE - which is correct for [1,5,3]
            expect(spin.payout).to.equal(0); // No payout for losing combination
        });
        
        it("should handle winning combinations correctly", async function () {
            // Request a 3-reel spin
            await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
            const tx = await casinoSlot.connect(player1).spinReels(3);
            const receipt = await tx.wait();
            
            const spinRequestedEvent = receipt.events.find(e => e.event === "SpinInitiated");
            const requestId = spinRequestedEvent.args.requestId;

            // Use the same randomness as the working 4-reel test: generates winning combo
            await casinoSlot.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x03030303")]);

            // Check the spin result
            const spin = await casinoSlot.spins(requestId);
            const reels = await casinoSlot.getSpinReels(requestId);
            
            expect(spin.settled).to.be.true;
            expect(spin.player).to.equal(player1.address);
            expect(spin.reelCount).to.equal(3);
            // Should be a winning combination (exact type depends on generated reels)
            expect(spin.payoutType).to.be.greaterThan(0);
            expect(spin.payout.gt(0)).to.be.true;
        });

        it("should support different reel modes with correct costs", async function () {
            await casinoSlot.setTestETHPrice(2000 * 100);

            const cost3 = await casinoSlot.getSpinCost(3);
            expect(cost3).to.be.gt(0);

            const cost4 = await casinoSlot.getSpinCost(4);
            expect(cost4).to.be.gt(cost3);

            const cost7 = await casinoSlot.getSpinCost(7);
            expect(cost7).to.be.gt(cost4);
        });

        it("should handle 4-reel spins correctly", async function () {
            // Request a 4-reel spin
            await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
            const tx = await casinoSlot.connect(player1).spinReels(4);
            const receipt = await tx.wait();
            
            const spinRequestedEvent = receipt.events.find(e => e.event === "SpinInitiated");
            const requestId = spinRequestedEvent.args.requestId;

            // Mock the VRF response to generate [4,4,4,4] reels (all diamonds)
            await casinoSlot.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x03030303")]);

            // Check the spin result
            const spin = await casinoSlot.spins(requestId);
            const reels = await casinoSlot.getSpinReels(requestId);
            
            expect(spin.settled).to.be.true;
            expect(spin.reelCount).to.equal(4);
            expect(spin.payoutType).to.be.gt(0); // Should be a winning combo
            expect(spin.payout).to.be.gt(0);
        });

        it("should handle losing combinations", async function () {
            // Request a 3-reel spin
            await casinoSlot.connect(player1).approve(casinoSlot.address, ethers.constants.MaxUint256);
            const tx = await casinoSlot.connect(player1).spinReels(3);
            const receipt = await tx.wait();
            
            const spinRequestedEvent = receipt.events.find(e => e.event === "SpinInitiated");
            const requestId = spinRequestedEvent.args.requestId;

            // Mock the VRF response with a losing combination (123)
            await casinoSlot.testFulfillRandomWords(requestId, [ethers.BigNumber.from("0x020100")]);

            // Check the spin result
            const spin = await casinoSlot.spins(requestId);
            const reels = await casinoSlot.getSpinReels(requestId);
            
            expect(spin.settled).to.be.true;
            expect(spin.payoutType).to.equal(0); // LOSE
            expect(spin.payout).to.equal(0); // No payout
        });
    });

    describe("Admin Functions", function () {
        it("should allow owner to update PayoutTables address", async function () {
            const newPayoutTables = ethers.Wallet.createRandom().address;
            
            await expect(casinoSlot.updatePayoutTables(newPayoutTables))
                .to.emit(casinoSlot, "PayoutTablesUpdated")
                .withArgs(newPayoutTables);
                
            const gameStats = await casinoSlot.getGameStats();
            expect(gameStats.payoutTablesAddress).to.equal(newPayoutTables);
        });

        it("should not allow non-owner to update PayoutTables", async function () {
            const newPayoutTables = ethers.Wallet.createRandom().address;
            
            await expect(casinoSlot.connect(player1).updatePayoutTables(newPayoutTables))
                .to.be.reverted; // Simple revert check
        });
    });
}); 