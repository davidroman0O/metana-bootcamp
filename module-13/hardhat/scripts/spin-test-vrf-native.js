const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔄 Testing VRF with Native ETH Payment");
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
    
    console.log(`🧪 SpinTester address: ${TESTER_ADDRESS}`);
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${deployer.address}`);
    
    // Get contract instance
    const spinTester = await ethers.getContractAt("SpinTester", TESTER_ADDRESS);
    
    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(TESTER_ADDRESS);
    console.log(`\n💰 Contract ETH balance: ${ethers.utils.formatEther(ethBalance)} ETH`);
    
    if (ethBalance.eq(0)) {
        console.error("❌ Contract needs ETH to run this test.");
        console.error("Please fund the contract first using the funding script.");
        return;
    }
    
    // Amount of ETH to send for VRF request
    const vrfEthAmount = ethers.utils.parseEther("0.001"); // 0.001 ETH
    console.log(`\n💸 Sending ${ethers.utils.formatEther(vrfEthAmount)} ETH for VRF request...`);
    
    // Make VRF request with native ETH payment
    console.log("🔄 Requesting random number with native ETH payment...");
    
    try {
        const tx = await spinTester.test_VRFRequestWithETH({
            value: vrfEthAmount,
            gasLimit: 1000000
        });
        
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Find the TestCompleted event
        const testCompletedEvent = receipt.events.find(
            (event) => event.event === "TestCompleted" && event.args.testName === "VRFRequestWithETH"
        );
        
        // Find the RandomWordsRequested event
        const randomWordsRequestedEvent = receipt.events.find(
            (event) => event.event === "RandomWordsRequested"
        );
        
        if (randomWordsRequestedEvent) {
            const requestId = randomWordsRequestedEvent.args.requestId;
            console.log(`\n📝 Request ID: ${requestId.toString()}`);
            console.log(`To check the status: REQUEST_ID=${requestId.toString()} npx hardhat run scripts/spin-test-check-vrf.js --network sepolia`);
        }
        
        if (testCompletedEvent) {
            const success = testCompletedEvent.args.success;
            const details = testCompletedEvent.args.details;
            
            console.log(`\nTest Result: ${success ? "✅ PASSED" : "❌ FAILED"}`);
            console.log(`Details: ${details}`);
            
            // Extract request ID if successful
            if (success) {
                const requestIdMatch = details.match(/RequestId: (\d+)/);
                if (requestIdMatch && requestIdMatch[1]) {
                    const requestId = requestIdMatch[1];
                    console.log(`\n🔢 Request ID: ${requestId}`);
                    console.log(`\n⏳ Waiting for VRF fulfillment...`);
                    console.log(`You can check the status later using:`);
                    console.log(`npx hardhat run scripts/spin-test-check-vrf.js --network ${network.name} ${requestId}`);
                }
            }
        } else {
            console.log("\n❌ No test result event found");
        }
        
        // Print all events for debugging
        console.log("\n🔍 All events:");
        for (const event of receipt.events) {
            if (event.event) {
                console.log(`- ${event.event}: ${JSON.stringify(event.args)}`);
            }
        }
    } catch (error) {
        console.error("\n❌ Transaction failed:");
        console.error(error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 