/**
 * Test Player Script - Emulates a real player spinning and waiting for results
 * 
 * This script:
 * 1. Connects to deployed CasinoSlot contract
 * 2. Places a spin bet
 * 3. Waits for VRF fulfillment
 * 4. Prints the complete spin result
 * 
 * Usage: npm run test-player
 */

const { ethers } = require("hardhat");
const hre = require("hardhat");

async function testPlayerSpin() {
    console.log("🎰 Test Player - Casino Slot Spin Simulator");
    console.log("===========================================\n");
    
    try {
        // Get network info
        const network = await hre.ethers.provider.getNetwork();
        
        if (network.chainId !== 31337) {
            console.log("⚠️  This script is designed for local development (chainId 31337)");
            console.log("   Make sure you're running against localhost network");
            return;
        }
        
        // Load deployment data
        const fs = require("fs");
        const path = require("path");
        const deploymentFile = path.join(__dirname, "../deployments", `deployment-${network.chainId}.json`);
        
        if (!fs.existsSync(deploymentFile)) {
            console.error("❌ Deployment file not found. Please deploy contracts first:");
            console.error("   npm run deploy");
            return;
        }
        
        const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        
        // Handle different deployment structures (CasinoSlot vs CasinoSlotTest)
        let casinoSlotAddress;
        if (deploymentData.contracts.CasinoSlot) {
            casinoSlotAddress = deploymentData.contracts.CasinoSlot.address || deploymentData.contracts.CasinoSlot.proxy;
        } else if (deploymentData.contracts.CasinoSlotTest) {
            casinoSlotAddress = deploymentData.contracts.CasinoSlotTest.proxy || deploymentData.contracts.CasinoSlotTest.address;
        } else {
            throw new Error("No CasinoSlot or CasinoSlotTest contract found in deployment");
        }
        
        console.log(`🎯 Connected to CasinoSlot: ${casinoSlotAddress}`);
        
        // Get CasinoSlot contract (use test version for local development)
        const contractFactory = network.chainId === 31337 ? "CasinoSlotTest" : "CasinoSlot";
        const CasinoSlot = await ethers.getContractFactory(contractFactory);
        const casinoSlot = CasinoSlot.attach(casinoSlotAddress);
        
        console.log(`🔧 Using contract factory: ${contractFactory}`);
        
        // Test basic contract functionality
        console.log(`\n🔍 Contract Health Check:`);
        try {
            const contractBalance = await ethers.provider.getBalance(casinoSlotAddress);
            console.log(`   ✅ Contract ETH Balance: ${ethers.utils.formatEther(contractBalance)} ETH`);
            
            const totalPrizePool = await casinoSlot.totalPrizePool();
            console.log(`   ✅ Total Prize Pool: ${ethers.utils.formatEther(totalPrizePool)} ETH`);
            
            const houseEdge = await casinoSlot.houseEdge();
            console.log(`   ✅ House Edge: ${houseEdge} basis points`);
            
        } catch (healthError) {
            console.log(`   ⚠️  Contract health check failed: ${healthError.message}`);
        }
        
        // Get test player (use account #1 - different from deployer)
        const [deployer, testPlayer] = await ethers.getSigners();
        
        console.log(`👤 Test Player: ${testPlayer.address}`);
        console.log(`💰 Player Balance: ${ethers.utils.formatEther(await testPlayer.getBalance())} ETH\n`);
        
        // Contract info
        const contractBalance = await ethers.provider.getBalance(casinoSlotAddress);
        console.log(`🏦 Casino Pool: ${ethers.utils.formatEther(contractBalance)} ETH`);
        
        // First, buy CHIPS for the player
        const ethForChips = ethers.utils.parseEther("1.0"); // Buy 1 ETH worth of CHIPS
        console.log(`\n💰 Buying CHIPS for player...`);
        console.log(`   💸 ETH to spend: ${ethers.utils.formatEther(ethForChips)} ETH`);
        
        const buyTx = await casinoSlot.connect(testPlayer).buyChips({ 
            value: ethForChips,
            gasLimit: 300000
        });
        const buyReceipt = await buyTx.wait();
        console.log(`   ✅ CHIPS purchase transaction completed: ${buyReceipt.transactionHash}`);
        
        // Try to get CHIPS balance with error handling
        let chipsBalance;
        try {
            chipsBalance = await casinoSlot.balanceOf(testPlayer.address);
            console.log(`   ✅ CHIPS received: ${ethers.utils.formatEther(chipsBalance)} CHIPS`);
        } catch (balanceError) {
            console.log(`   ⚠️  Could not read CHIPS balance: ${balanceError.message}`);
            console.log(`   🔄 Continuing with estimated balance...`);
            // Estimate based on purchase amount (this is rough)
            chipsBalance = ethers.utils.parseEther("1000"); // Approximate
        }
        
        // Spin parameters
        const reelCount = 4; // 4-reel slot
        let spinCost;
        try {
            spinCost = await casinoSlot.getSpinCost(reelCount);
            console.log(`\n🎰 Spin Configuration:`);
            console.log(`   🎰 Reel Count: ${reelCount}`);
            console.log(`   💰 Cost per spin: ${ethers.utils.formatEther(spinCost)} CHIPS`);
        } catch (costError) {
            console.log(`   ⚠️  Could not get spin cost: ${costError.message}`);
            spinCost = ethers.utils.parseEther("100"); // Default fallback
            console.log(`   🔄 Using fallback spin cost: ${ethers.utils.formatEther(spinCost)} CHIPS`);
        }
        
        console.log(`\n🎰 Preparing to spin:`);
        console.log(`   🎯 Reel Count: ${reelCount} reels`);
        console.log(`   💰 Spin Cost: ${ethers.utils.formatEther(spinCost)} CHIPS`);
        console.log(`   👛 Player CHIPS: ${ethers.utils.formatEther(chipsBalance)} CHIPS`);
        console.log(`   ⏰ Timestamp: ${new Date().toLocaleTimeString()}\n`);
        
        // Check if player has enough CHIPS
        if (chipsBalance.lt(spinCost)) {
            console.error(`❌ Insufficient CHIPS! Need ${ethers.utils.formatEther(spinCost)} but have ${ethers.utils.formatEther(chipsBalance)}`);
            return;
        }
        
        // Set up event listeners BEFORE spinning
        let spinRequestId = null;
        let spinCompleted = false;
        
        // Listen for SpinInitiated event
        casinoSlot.on("SpinInitiated", (requestId, player, reelCount, betAmount, vrfCostETH, houseFeeETH, prizePoolContribution, timestamp, event) => {
            console.log(`🎲 Spin Initiated:`);
            console.log(`   📋 Request ID: ${requestId}`);
            console.log(`   👤 Player: ${player}`);
            console.log(`   🎰 Reel Count: ${reelCount}`);
            console.log(`   💰 Bet: ${ethers.utils.formatEther(betAmount)} CHIPS`);
            console.log(`   ⛽ VRF Cost: ${ethers.utils.formatEther(vrfCostETH)} ETH`);
            console.log(`   🧱 Block: ${event.blockNumber}`);
            console.log(`   ⏳ Waiting for VRF fulfillment...\n`);
            
            spinRequestId = requestId;
        });
        
        // Listen for SpinCompleted event
        casinoSlot.on("SpinCompleted", (requestId, player, reelCount, reels, payoutType, payout, isJackpot, event) => {
            console.log(`🎊 SPIN RESULT:`);
            console.log(`   📋 Request ID: ${requestId}`);
            console.log(`   🎰 Reels: [${reels.join(', ')}]`);
            console.log(`   🏆 Payout Type: ${getPayoutTypeName(payoutType)}`);
            console.log(`   💰 Payout: ${ethers.utils.formatEther(payout)} CHIPS`);
            console.log(`   🧱 Block: ${event.blockNumber}`);
            console.log(`   ⏰ Completed: ${new Date().toLocaleTimeString()}\n`);
            
            if (payout.gt(0)) {
                console.log(`🎉 WINNER! You won ${ethers.utils.formatEther(payout)} CHIPS!`);
            } else {
                console.log(`😞 No win this time. Better luck next spin!`);
            }
            
            spinCompleted = true;
        });
        
        // Approve CHIPS for the spin first
        console.log(`🔑 Approving CHIPS for spin...`);
        const approveTx = await casinoSlot.connect(testPlayer).approve(casinoSlot.address, spinCost, {
            gasLimit: 100000
        });
        await approveTx.wait();
        console.log(`✅ CHIPS approved for spending\n`);
        
        // Execute the spin
        console.log(`🚀 Executing spin transaction...`);
        
        try {
            const spinTx = await casinoSlot.connect(testPlayer).spinReels(reelCount, {
                gasLimit: 500000 // Ensure enough gas
            });
            
            console.log(`✅ Spin transaction submitted: ${spinTx.hash}`);
            console.log(`⏳ Waiting for transaction confirmation...\n`);
            
            const spinReceipt = await spinTx.wait();
            console.log(`✅ Spin transaction confirmed in block ${spinReceipt.blockNumber}`);
            console.log(`📊 Gas used: ${spinReceipt.gasUsed.toString()}`);
            console.log(`📋 Events emitted: ${spinReceipt.events ? spinReceipt.events.length : 0}`);
            
            if (spinReceipt.events && spinReceipt.events.length > 0) {
                console.log(`📝 Event details:`);
                spinReceipt.events.forEach((event, i) => {
                    console.log(`   ${i + 1}. ${event.event || 'Unknown Event'}`);
                });
            } else {
                console.log(`⚠️  No events were emitted - this suggests the function failed silently`);
            }
        } catch (spinError) {
            console.error(`❌ Spin transaction failed: ${spinError.message}`);
            if (spinError.reason) {
                console.error(`   Reason: ${spinError.reason}`);
            }
            return;
        }
        
        // Wait for VRF fulfillment (max 30 seconds)
        console.log(`⏳ Waiting for VRF fulfillment...`);
        console.log(`   💡 Make sure VRF fulfiller is running: npm run vrf:fulfiller\n`);
        
        const maxWaitTime = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (!spinCompleted && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (elapsed % 5 === 0 && elapsed > 0) {
                console.log(`   ⏰ Still waiting... ${elapsed}s elapsed`);
            }
        }
        
        if (!spinCompleted) {
            console.log(`⚠️  VRF fulfillment timed out after 30 seconds`);
            console.log(`   Please check that VRF fulfiller is running: npm run vrf:fulfiller`);
            console.log(`   You can also manually fulfill the request ID: ${spinRequestId}`);
        }
        
        // Final player balance
        const finalBalance = await testPlayer.getBalance();
        const finalChipsBalance = await casinoSlot.balanceOf(testPlayer.address);
        console.log(`\n📊 Final Results:`);
        console.log(`   👤 Player ETH Balance: ${ethers.utils.formatEther(finalBalance)} ETH`);
        console.log(`   🪙 Player CHIPS Balance: ${ethers.utils.formatEther(finalChipsBalance)} CHIPS`);
        console.log(`   🏦 Casino Pool: ${ethers.utils.formatEther(await ethers.provider.getBalance(casinoSlotAddress))} ETH`);
        
        // Clean up event listeners
        casinoSlot.removeAllListeners();
        
    } catch (error) {
        console.error("❌ Test Player Error:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.error("💸 Player needs more ETH. Fund the test address:");
            console.error("   Test address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
        }
    }
}

function getPayoutTypeName(payoutType) {
    const types = [
        "LOSE",           // 0
        "SMALL_WIN",      // 1  
        "MEDIUM_WIN",     // 2
        "BIG_WIN",        // 3
        "SPECIAL_COMBO",  // 4
        "MEGA_WIN",       // 5
        "ULTRA_WIN",      // 6
        "JACKPOT"         // 7
    ];
    
    return types[payoutType] || `UNKNOWN(${payoutType})`;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Test Player stopped');
    process.exit(0);
});

// Auto-run if called directly
if (require.main === module) {
    testPlayerSpin()
        .then(() => {
            console.log('\n🎉 Test Player session completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Failed to run test player:", error);
            process.exit(1);
        });
}

module.exports = testPlayerSpin; 