const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🔄 Testing VRF with LINK Payment");
    console.log("=================================");
    
    // Load tester deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ SpinTester deployment not found at ${deploymentPath}`);
        console.error("Please run spin-test-deploy.js first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const TESTER_ADDRESS = deployment.spinTester.address;
    const LINK_TOKEN = deployment.parameters.linkToken;
    
    console.log(`🧪 SpinTester address: ${TESTER_ADDRESS}`);
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${deployer.address}`);
    
    // Get contract instance
    const spinTester = await ethers.getContractAt("SpinTester", TESTER_ADDRESS);
    
    // Check LINK balance
    const linkToken = await ethers.getContractAt("IERC20", LINK_TOKEN);
    const linkBalance = await linkToken.balanceOf(TESTER_ADDRESS);
    console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
    
    if (linkBalance.eq(0)) {
        console.error("❌ Contract needs LINK to run this test.");
        console.error("Please fund the contract first using the funding script.");
        return;
    }
    
    // Test VRF with LINK payment
    console.log("\n🔄 Requesting random number with LINK payment...");
    
    try {
        const tx = await spinTester.test_VRFRequestWithLINK({
            gasLimit: 500000 // Increased gas limit for LINK payment
        });
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Find the TestCompleted event
        const testCompletedEvent = receipt.events.find(
            (e) => e.event === "TestCompleted" && e.args[0] === "VRFRequestWithLINK"
        );
        
        if (testCompletedEvent) {
            const [testName, success, details] = testCompletedEvent.args;
            console.log(`\nTest Result: ${success ? "✅ PASSED" : "❌ FAILED"}`);
            console.log(`Details: ${details}`);
        }
        
        // Find the RandomWordsRequested event
        const randomWordsRequestedEvent = receipt.events.find(
            (e) => e.event === "RandomWordsRequested"
        );
        
        if (randomWordsRequestedEvent) {
            const requestId = randomWordsRequestedEvent.args.requestId;
            console.log(`\n📝 Request ID: ${requestId.toString()}`);
            console.log(`To check the status: REQUEST_ID=${requestId.toString()} npx hardhat run scripts/spin-test-check-vrf.js --network sepolia`);
        }
        
        console.log("\n⏳ Waiting for VRF fulfillment...");
        console.log("You can check the status later using:");
        console.log(`npx hardhat run scripts/spin-test-check-vrf.js --network sepolia ${randomWordsRequestedEvent ? randomWordsRequestedEvent.args.requestId.toString() : ''}`);
        
        console.log("\n🔍 All events:");
        for (const event of receipt.events) {
            if (event.event) {
                console.log(`- ${event.event}: ${JSON.stringify(event.args)}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 