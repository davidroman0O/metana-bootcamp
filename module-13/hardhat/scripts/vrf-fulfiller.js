/**
 * VRF Fulfiller Service for Local Development
 * 
 * This script continuously listens for SpinRequested events and automatically
 * fulfills VRF requests with random numbers, simulating Chainlink VRF behavior.
 * 
 * Runs as a persistent service until manually stopped.
 */

const { ethers } = require("hardhat");
const hre = require("hardhat");

async function startVRFListenerService() {
    console.log("🎲 Starting VRF Fulfiller Service...");
    console.log("   👂 Listening for SpinRequested events continuously");
    console.log("   ⚡ Will auto-fulfill VRF requests as they arrive");
    console.log("   🛑 Press Ctrl+C to stop the service\n");
    
    try {
        // Get network info
        const network = await hre.ethers.provider.getNetwork();
        console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
        
        if (network.chainId !== 31337) {
            console.log("⚠️  VRF Fulfiller service is designed for local development (chainId 31337)");
            console.log("   For mainnet/testnet deployments, use real Chainlink VRF subscription");
            console.log("   This service will attempt to run but may not work on live networks");
            console.log("   Press Ctrl+C to stop or continue at your own risk...\n");
        }
        
        // Load deployment data
        const fs = require("fs");
        const path = require("path");
        const deploymentFile = path.join(__dirname, "../deployments", `deployment-${network.chainId}.json`);
        
        if (!fs.existsSync(deploymentFile)) {
            console.error(`❌ Deployment file not found: deployment-${network.chainId}.json`);
            console.error("Available deployment files:");
            const deploymentDir = path.join(__dirname, "../deployments");
            if (fs.existsSync(deploymentDir)) {
                const files = fs.readdirSync(deploymentDir).filter(f => f.startsWith('deployment-'));
                files.forEach(file => console.error(`   - ${file}`));
            }
            console.error("Please deploy contracts first or check network connection.");
            return;
        }
        
        const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        const casinoSlotAddress = deploymentData.contracts.CasinoSlot.address;
        const vrfCoordinatorAddress = deploymentData.contracts.CasinoSlot.constructor.vrfCoordinator;
        
        console.log(`🎰 Monitoring CasinoSlot: ${casinoSlotAddress}`);
        console.log(`📍 VRF Coordinator: ${vrfCoordinatorAddress}`);
        console.log(`🔗 Deployment: ${deploymentData.network.name} (${deploymentData.network.chainId})`);
        
        if (deploymentData.vrfVersion) {
            console.log(`🎲 VRF Version: ${deploymentData.vrfVersion}`);
        }
        
        // Get CasinoSlot contract (use test version for local development)
        const contractFactory = network.chainId === 31337 ? "CasinoSlotTest" : "CasinoSlot";
        const CasinoSlot = await ethers.getContractFactory(contractFactory);
        const casinoSlot = CasinoSlot.attach(casinoSlotAddress);
        
        console.log(`🔧 Using contract factory: ${contractFactory}`);
        
        // Get signer for funding VRF coordinator with gas
        const [deployer] = await ethers.getSigners();
        
        let requestCount = 0;
        
        // Set up event listener for SpinRequested events
        console.log("✅ VRF Fulfiller Service is running!");
        console.log("⏳ Waiting for spin requests...\n");
        
        casinoSlot.on("SpinRequested", async (requestId, player, reelCount, betAmount, event) => {
            requestCount++;
            
            console.log(`\n🎰 VRF Request #${requestCount} Detected:`);
            console.log(`   📋 Request ID: ${requestId}`);
            console.log(`   👤 Player: ${player}`);
            console.log(`   🎰 Reel Count: ${reelCount}`);
            console.log(`   💰 Bet Amount: ${ethers.utils.formatEther(betAmount)} CHIPS`);
            console.log(`   🧱 Block: ${event.blockNumber}`);
            
            try {
                // Generate random words for fulfillment
                const numWords = 1; // CasinoSlot expects 1 random word
                const randomWords = [];
                
                for (let i = 0; i < numWords; i++) {
                    // Generate a proper random number
                    const randomWord = ethers.BigNumber.from(ethers.utils.randomBytes(32));
                    randomWords.push(randomWord);
                }
                
                console.log(`   🎲 Generated random words: ${randomWords.map(w => w.toString())}`);
                
                // Fulfill VRF request (method depends on network)
                console.log(`   ⚡ Auto-fulfilling VRF request...`);
                
                if (network.chainId === 31337) {
                    console.log(`   🔧 Using hardhat impersonation for local development`);
                } else {
                    console.log(`   ⚠️  Attempting VRF fulfillment on live network - this may fail`);
                    console.log(`   💡 For production, use real Chainlink VRF subscription`);
                }
                
                // Use hardhat_impersonateAccount to call from VRF coordinator address
                await hre.network.provider.request({
                  method: "hardhat_impersonateAccount",
                  params: [vrfCoordinatorAddress],
                });
                
                // Get the impersonated signer
                const vrfCoordinatorSigner = await ethers.getSigner(vrfCoordinatorAddress);
                
                // Fund the VRF coordinator with gas (network-specific handling)
                try {
                    if (network.chainId === 31337) {
                        // Hardhat network - use setBalance for mock coordinator
                        await hre.network.provider.send("hardhat_setBalance", [
                            vrfCoordinatorAddress,
                            "0xDE0B6B3A7640000", // 1 ETH in hex
                        ]);
                        console.log(`   💰 Set mock VRF coordinator balance to 1 ETH for gas`);
                    } else {
                        // Live network - attempt to send ETH (may fail for real VRF coordinators)
                        await deployer.sendTransaction({
                          to: vrfCoordinatorAddress,
                          value: ethers.utils.parseEther("0.1") // Smaller amount for live networks
                        });
                        console.log(`   💰 Funded VRF coordinator with 0.1 ETH for gas`);
                    }
                } catch (fundingError) {
                    console.log(`   ⚠️  Could not fund VRF coordinator: ${fundingError.message}`);
                    console.log(`   🔄 Continuing with fulfillment attempt...`);
                }
                
                // Call rawFulfillRandomWords from the VRF coordinator
                const tx = await casinoSlot.connect(vrfCoordinatorSigner).rawFulfillRandomWords(requestId, randomWords, {
                    gasLimit: 500000 // Ensure enough gas for complex calculations
                });
                
                const receipt = await tx.wait();
                console.log(`   ✅ VRF fulfilled! Tx: ${receipt.transactionHash}`);
                
                // Stop impersonating
                await hre.network.provider.request({
                  method: "hardhat_stopImpersonatingAccount",
                  params: [vrfCoordinatorAddress],
                });
                
                // Check for SpinResult event to see the outcome
                const spinResultFilter = casinoSlot.filters.SpinResult();
                const spinResultEvents = await casinoSlot.queryFilter(spinResultFilter, receipt.blockNumber, receipt.blockNumber);
                
                if (spinResultEvents.length > 0) {
                    const resultEvent = spinResultEvents[0];
                    const { reels, payoutType, payout } = resultEvent.args;
                    
                    console.log(`   🎊 Spin Result:`);
                    console.log(`      🎰 Reels: [${reels.join(', ')}]`);
                    console.log(`      🏆 Payout Type: ${getPayoutTypeName(payoutType)}`);
                    console.log(`      💰 Payout: ${ethers.utils.formatEther(payout)} CHIPS`);
                }
                
                console.log(`\n👂 Listening for next VRF request...`);
                
            } catch (error) {
                console.error(`   ❌ Failed to fulfill VRF request ${requestId}:`, error.message);
                console.log(`\n👂 Continuing to listen for next VRF request...`);
            }
        });
        
        // Set up SpinResult event listener for additional logging
        casinoSlot.on("SpinResult", (requestId, player, reelCount, reels, payoutType, payout, event) => {
            console.log(`   📊 Spin completed for request ${requestId} - ${getPayoutTypeName(payoutType)}`);
        });
        
        // Keep the service running
        await new Promise(() => {}); // Run forever until process is killed
        
    } catch (error) {
        console.error("❌ VRF Fulfiller Service error:", error);
    }
}

function getPayoutTypeName(payoutType) {
    const types = [
        "LOSE",           // 0
        "SMALL_WIN",      // 1  
        "MEDIUM_WIN",     // 2
        "BIG_WIN",        // 3
        "MEGA_WIN",       // 4
        "ULTRA_WIN",      // 5
        "SPECIAL_COMBO",  // 6
        "JACKPOT"         // 7
    ];
    
    return types[payoutType] || `UNKNOWN(${payoutType})`;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 VRF Fulfiller Service stopped');
    console.log('👋 Thank you for using the VRF Fulfiller Service!');
    process.exit(0);
});

// Auto-run if called directly
if (require.main === module) {
    startVRFListenerService()
        .catch((error) => {
            console.error("❌ Failed to start VRF Fulfiller Service:", error);
            process.exit(1);
        });
}

module.exports = startVRFListenerService; 