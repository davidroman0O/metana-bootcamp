/**
 * Test Script for VRF Fulfiller
 * 
 * This script simulates a player making spins to test the VRF fulfiller
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("🎰 Testing VRF Fulfiller...");

  // Get the deployed contract
  const deploymentData = require("../deployments/deployment-31337.json");
  const casinoSlotAddress = deploymentData.contracts.CasinoSlot.address;
  
  console.log(`📍 CasinoSlot Contract: ${casinoSlotAddress}`);
  
  // Get contract instance
  const CasinoSlot = await ethers.getContractFactory("CasinoSlot");
  const casinoSlot = CasinoSlot.attach(casinoSlotAddress);
  
  // Get signers
  const [owner, player1] = await ethers.getSigners();
  console.log(`👤 Player: ${player1.address}`);
  
  // Give player some chips first
  console.log("\n💰 Getting chips for player...");
  const buyTx = await casinoSlot.connect(player1).buyChips({ 
    value: ethers.utils.parseEther("1.0") 
  });
  await buyTx.wait();
  
  const balance = await casinoSlot.balanceOf(player1.address);
  console.log(`✅ Player balance: ${ethers.utils.formatEther(balance)} CHIPS`);
  
  // Make a few spins to test VRF fulfiller
  console.log("\n🎲 Making test spins...");
  console.log("(Make sure VRF fulfiller is running in another terminal)");
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n🎰 Spin ${i}:`);
    
    const tx = await casinoSlot.connect(player1).spin3Reels();
    const receipt = await tx.wait();
    
    const spinEvent = receipt.events.find(e => e.event === "SpinRequested");
    if (spinEvent) {
      console.log(`   ✅ Spin requested! Request ID: ${spinEvent.args.requestId}`);
      console.log(`   👂 Waiting for VRF fulfiller to process...`);
      
      // Wait a moment for fulfillment
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log("\n🏁 Test spins completed!");
  console.log("Check the VRF fulfiller terminal for fulfillment messages.");
}

main().catch((error) => {
  console.error("❌ Test Error:", error);
  process.exit(1);
}); 