const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    // Check if request ID is provided as an environment variable
    const requestId = process.env.REQUEST_ID;
    
    if (!requestId) {
        console.error("❌ Please provide a request ID as an environment variable");
        console.error("Example: REQUEST_ID=123456789 npx hardhat run scripts/spin-test-check-vrf.js --network localhost");
        process.exit(1);
    }

    console.log(`\n🔍 Checking VRF Request Status for ID: ${requestId}`);
    console.log("=======================================");
    
    // Load tester deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ SpinTester deployment not found at ${deploymentPath}`);
        console.error("Please run spin-test-deploy.js first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const TESTER_ADDRESS = deployment.spinTester.address;
    
    console.log(`🧪 SpinTester address: ${TESTER_ADDRESS}`);
    
    // Get contract instance
    const spinTester = await ethers.getContractAt("SpinTester", TESTER_ADDRESS);
    
    // Get VRF result
    const result = await spinTester.getVRFResult(requestId);
    const fulfilled = result[0];
    const randomWords = result[1];
    const paid = result[2];
    const nativePayment = result[3];
    
    console.log(`\n📊 VRF Request Status:`);
    console.log(`Request ID: ${requestId}`);
    console.log(`Fulfilled: ${fulfilled ? "✅ Yes" : "❌ No"}`);
    console.log(`Payment method: ${nativePayment ? "Native ETH" : "LINK token"}`);
    console.log(`Amount paid: ${ethers.utils.formatEther(paid)} ${nativePayment ? "ETH" : "LINK"}`);
    
    if (fulfilled) {
        console.log(`\n🎲 Random values:`);
        for (let i = 0; i < randomWords.length; i++) {
            console.log(`Word ${i+1}: ${randomWords[i].toString()}`);
        }
        
        // If we have at least one random word, show some derived values
        if (randomWords.length > 0) {
            const randomValue = randomWords[0];
            console.log(`\n🎮 Sample derived values (for 3-reel slot):`);
            
            // Generate 3 reels (values 1-6)
            const reels = [];
            for (let i = 0; i < 3; i++) {
                // Extract 8 bits for each reel, then mod 6 to get 1-6
                const reelValue = ((randomValue.shr(i * 8)).mod(6)).add(1);
                reels.push(reelValue.toString());
            }
            
            console.log(`Reels: [${reels.join(', ')}]`);
        }
    } else {
        console.log(`\n⏳ Request is not fulfilled yet. Please check again later.`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 