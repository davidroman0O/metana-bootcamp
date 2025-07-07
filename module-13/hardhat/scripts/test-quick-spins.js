const { ethers } = require("hardhat");
const hre = require("hardhat");
const { getAddresses } = require("./utils/addresses");

async function quickSpins() {
    console.log("🎰 Quick Test Spins for Subgraph\n");
    
    const [player1, player2] = await ethers.getSigners();
    const addresses = getAddresses(hre.network.name);
    
    if (!addresses || !addresses.casino || !addresses.casino.proxy) {
        throw new Error("No casino contract found. Please deploy contracts first.");
    }
    
    const CasinoSlot = await ethers.getContractFactory("CasinoSlotTest");
    const casinoSlot = CasinoSlot.attach(addresses.casino.proxy);
    
    console.log(`📍 Casino: ${addresses.casino.proxy}`);
    console.log(`👤 Player 1: ${player1.address}`);
    console.log(`👤 Player 2: ${player2.address}\n`);
    
    // Buy CHIPS for both players
    console.log("💰 Buying CHIPS...");
    await casinoSlot.connect(player1).buyChips({ value: ethers.utils.parseEther("0.5") });
    await casinoSlot.connect(player2).buyChips({ value: ethers.utils.parseEther("0.5") });
    console.log("✅ CHIPS purchased\n");
    
    // Do a few quick spins
    console.log("🎲 Executing spins...");
    
    // Player 1 - Spin 1
    const spinCost3 = await casinoSlot.getSpinCost(3);
    await casinoSlot.connect(player1).approve(casinoSlot.address, spinCost3);
    const tx1 = await casinoSlot.connect(player1).spinReels(3);
    console.log(`   Player 1 spin 1 (3 reels): ${tx1.hash}`);
    
    // Player 2 - Spin 1
    const spinCost4 = await casinoSlot.getSpinCost(4);
    await casinoSlot.connect(player2).approve(casinoSlot.address, spinCost4);
    const tx2 = await casinoSlot.connect(player2).spinReels(4);
    console.log(`   Player 2 spin 1 (4 reels): ${tx2.hash}`);
    
    // Player 1 - Spin 2
    await casinoSlot.connect(player1).approve(casinoSlot.address, spinCost3);
    const tx3 = await casinoSlot.connect(player1).spinReels(3);
    console.log(`   Player 1 spin 2 (3 reels): ${tx3.hash}`);
    
    console.log("\n✅ Test spins completed!");
    console.log("📊 Check subgraph at: http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql");
}

quickSpins()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });