/**
 * Test Script for VRF Fulfiller
 * 
 * This script simulates a player making spins to test the VRF fulfiller
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("🎰 Testing VRF Fulfiller...");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get the deployed contract based on network
  const deploymentFile = `../deployments/deployment-${network.chainId}.json`;
  
  try {
    const deploymentData = require(deploymentFile);
    const casinoSlotAddress = deploymentData.contracts.CasinoSlot.address;
    
    console.log(`📍 CasinoSlot Contract: ${casinoSlotAddress}`);
    console.log(`🔗 Network: ${deploymentData.network.name} (${deploymentData.network.chainId})`);
  } catch (error) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.error("Please deploy contracts first or check network connection");
    process.exit(1);
  }

  const deploymentData = require(deploymentFile);
  const casinoSlotAddress = deploymentData.contracts.CasinoSlot.address;
  
  // Get contract instance (use test version for local development)
  const contractFactory = network.chainId === 31337 ? "CasinoSlotTest" : "CasinoSlot";
  const CasinoSlot = await ethers.getContractFactory(contractFactory);
  const casinoSlot = CasinoSlot.attach(casinoSlotAddress);
  
  console.log(`🔧 Using contract factory: ${contractFactory}`);
  
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
    
    // Get spin cost and approve CHIPS
    const spinCost = await casinoSlot.getSpinCost(3);
    console.log(`   💰 Spin cost: ${ethers.utils.formatEther(spinCost)} CHIPS`);
    
    console.log(`   ✅ Approving CHIPS for spin...`);
    const approveTx = await casinoSlot.connect(player1).approve(casinoSlot.address, spinCost);
    await approveTx.wait();
    
    console.log(`   🎲 Executing spin...`);
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