const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔬 Running SpinTester Full Flow with Native ETH Payment");
    console.log("==============================================");
    
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
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${signer.address}`);
    
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
    
    // Run the full spin flow with native ETH payment
    console.log("\n🎮 Running full spin flow with native ETH payment (3 reels)...");
    const tx = await spinTester.test_FullSpinFlowNative(3, {
        value: ethers.utils.parseEther("0.001"),
        gasLimit: 1000000
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Find the TestCompleted event
    const testCompletedEvents = receipt.events.filter(e => 
        e.event === "TestCompleted" && e.args && e.args.testName === "FullSpinFlowNative"
    );
    
    if (testCompletedEvents.length > 0) {
        const event = testCompletedEvents[0];
        const success = event.args.success;
        const details = event.args.details;
        console.log(`\nTest Result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
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
        console.log("❌ No test result event found");
    }
    
    // Find the VRFRequested event
    const vrfRequestedEvents = receipt.events.filter(e => 
        e.event === "VRFRequested"
    );
    
    if (vrfRequestedEvents.length > 0) {
        const event = vrfRequestedEvents[0];
        const requestId = event.args.requestId.toString();
        const paid = ethers.utils.formatEther(event.args.paid);
        const nativePayment = event.args.nativePayment;
        
        console.log(`\nVRF Request Details:`);
        console.log(`Request ID: ${requestId}`);
        console.log(`Amount paid: ${paid} ETH`);
        console.log(`Native payment: ${nativePayment ? "Yes" : "No"}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 