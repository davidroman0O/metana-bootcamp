const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PayoutTables Basic API", function () {
    let payoutTables, payoutTables3, payoutTables4;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // Deploy PayoutTables contracts
        const PayoutTables3 = await ethers.getContractFactory("PayoutTables3");
        payoutTables3 = await PayoutTables3.deploy();
        await payoutTables3.deployed();

        const PayoutTables4 = await ethers.getContractFactory("PayoutTables4");
        payoutTables4 = await PayoutTables4.deploy();
        await payoutTables4.deployed();

        // Deploy main PayoutTables API (using PayoutTables3 as placeholders for 5-7)
        const PayoutTables = await ethers.getContractFactory("PayoutTables");
        payoutTables = await PayoutTables.deploy(
            payoutTables3.address,
            payoutTables4.address,
            payoutTables3.address, // Placeholder for 5
            payoutTables3.address, // Placeholder for 6
            payoutTables3.address  // Placeholder for 7
        );
        await payoutTables.deployed();
    });

    describe("3-Reel PayoutTable", function () {
        it("should return correct payouts for winning combinations", async function () {
            // Triple pumps (333) should be BIG_WIN (3)
            expect(await payoutTables.getPayoutType(3, 333)).to.equal(3);
            
            // Triple rockets (555) should be ULTRA_WIN (5) 
            expect(await payoutTables.getPayoutType(3, 555)).to.equal(5);
            
            // Triple jackpots (666) should be JACKPOT (7)
            expect(await payoutTables.getPayoutType(3, 666)).to.equal(7);
            
            // Triple copes (222) should be MEDIUM_WIN (2)
            expect(await payoutTables.getPayoutType(3, 222)).to.equal(2);
            
            // Triple diamonds (444) should be MEGA_WIN (4)
            expect(await payoutTables.getPayoutType(3, 444)).to.equal(4);
        });
        
        it("should return LOSE for non-winning combinations", async function () {
            // Mixed combinations should return LOSE (0)
            expect(await payoutTables.getPayoutType(3, 123)).to.equal(0);
            expect(await payoutTables.getPayoutType(3, 456)).to.equal(0);
            expect(await payoutTables.getPayoutType(3, 111)).to.equal(0); // All dumps = lose
        });

        it("should handle special 2-rocket combinations", async function () {
            // Two rockets should be SPECIAL_COMBO (6) = 20x multiplier
            expect(await payoutTables.getPayoutType(3, 551)).to.equal(6); // SPECIAL_COMBO
            expect(await payoutTables.getPayoutType(3, 515)).to.equal(6); // SPECIAL_COMBO
            expect(await payoutTables.getPayoutType(3, 155)).to.equal(6); // SPECIAL_COMBO
        });

        it("should handle 2-matching (non-rocket) combinations", async function () {
            // Two matching (non-rockets) should be SMALL_WIN (1) = 2x multiplier
            expect(await payoutTables.getPayoutType(3, 331)).to.equal(1); // SMALL_WIN
            expect(await payoutTables.getPayoutType(3, 221)).to.equal(1); // SMALL_WIN  
            expect(await payoutTables.getPayoutType(3, 441)).to.equal(1); // SMALL_WIN
        });
    });

    describe("4-Reel PayoutTable", function () {
        it("should return correct payouts for 4-reel combinations", async function () {
            // All pumps (3333) should be BIG_WIN (3)
            expect(await payoutTables.getPayoutType(4, 3333)).to.equal(3);
            
            // All rockets (5555) should be ULTRA_WIN (5)
            expect(await payoutTables.getPayoutType(4, 5555)).to.equal(5);
            
            // All jackpots (6666) should be JACKPOT (7)
            expect(await payoutTables.getPayoutType(4, 6666)).to.equal(7);
            
            // All diamonds (4444) should be MEGA_WIN (4)
            expect(await payoutTables.getPayoutType(4, 4444)).to.equal(4);
            
            // All copes (2222) should be MEDIUM_WIN (2)
            expect(await payoutTables.getPayoutType(4, 2222)).to.equal(2);
        });

        it("should handle 3-rocket special combinations", async function () {
            // Three rockets + one other should be SPECIAL_COMBO (6)
            expect(await payoutTables.getPayoutType(4, 5551)).to.equal(6); // SPECIAL_COMBO
            expect(await payoutTables.getPayoutType(4, 5552)).to.equal(6); // SPECIAL_COMBO
            expect(await payoutTables.getPayoutType(4, 5553)).to.equal(6); // SPECIAL_COMBO
        });

        it("should return LOSE for non-winning 4-reel combinations", async function () {
            expect(await payoutTables.getPayoutType(4, 1234)).to.equal(0); // LOSE
            expect(await payoutTables.getPayoutType(4, 1111)).to.equal(2); // All dumps actually = MEDIUM_WIN (not lose!)
        });
    });

    describe("API Management", function () {
        it("should return all table addresses correctly", async function () {
            const tables = await payoutTables.getAllPayoutTables();
            expect(tables.table3).to.equal(payoutTables3.address);
            expect(tables.table4).to.equal(payoutTables4.address);
            expect(tables.table5).to.equal(payoutTables3.address); // Placeholder
            expect(tables.table6).to.equal(payoutTables3.address); // Placeholder  
            expect(tables.table7).to.equal(payoutTables3.address); // Placeholder
        });

        it("should allow owner to update payout tables", async function () {
            const newTable = ethers.Wallet.createRandom().address;
            
            await expect(payoutTables.updatePayoutTable(3, newTable))
                .to.emit(payoutTables, "PayoutTableUpdated")
                .withArgs(3, newTable);
                
            const tables = await payoutTables.getAllPayoutTables();
            expect(tables.table3).to.equal(newTable);
        });

        it("should validate reel count bounds", async function () {
            await expect(payoutTables.getPayoutType(2, 123))
                .to.be.revertedWith("Invalid reel count");
                
            await expect(payoutTables.getPayoutType(8, 123))
                .to.be.revertedWith("Invalid reel count");
        });

        it("should have correct owner", async function () {
            expect(await payoutTables.owner()).to.equal(owner.address);
        });
    });
    
    describe("Integration Verification", function () {
        it("should demonstrate complete payout flow", async function () {
            console.log("\n🎰 PayoutTables Integration Test Results:");
            
            // Test various combinations
            const testCases = [
                { reels: 3, combo: 333, expected: 3, name: "Triple Pumps (3-reel)" },
                { reels: 3, combo: 555, expected: 5, name: "Triple Rockets (3-reel)" },
                { reels: 3, combo: 666, expected: 7, name: "Triple Jackpots (3-reel)" },
                { reels: 3, combo: 551, expected: 6, name: "Two Rockets Special (3-reel)" },
                { reels: 3, combo: 123, expected: 0, name: "Mixed Losing (3-reel)" },
                { reels: 4, combo: 4444, expected: 4, name: "All Diamonds (4-reel)" },
                { reels: 4, combo: 5551, expected: 6, name: "Three Rockets Special (4-reel)" },
                { reels: 4, combo: 1234, expected: 0, name: "Mixed Losing (4-reel)" }
            ];
            
            for (const test of testCases) {
                const result = await payoutTables.getPayoutType(test.reels, test.combo);
                expect(result).to.equal(test.expected);
                console.log(`  ✅ ${test.name}: ${test.combo} → PayoutType ${result}`);
            }
            
            console.log("\n🎉 All PayoutTables API tests completed successfully!");
        });
    });
}); 