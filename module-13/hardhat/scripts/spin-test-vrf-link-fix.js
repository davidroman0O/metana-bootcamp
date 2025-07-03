const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🔄 Testing VRF with LINK payment (fixed approach)");
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
    const LINK_TOKEN = deployment.parameters.linkToken;
    const VRF_WRAPPER = deployment.parameters.vrfWrapper;
    
    console.log(`🧪 SpinTester address: ${TESTER_ADDRESS}`);
    console.log(`🔗 LINK token address: ${LINK_TOKEN}`);
    console.log(`🎲 VRF Wrapper address: ${VRF_WRAPPER}`);
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${deployer.address}`);
    
    // Get contract instances
    const spinTester = await ethers.getContractAt("SpinTester", TESTER_ADDRESS);
    const linkToken = await ethers.getContractAt("IERC20", LINK_TOKEN);
    
    // Check LINK balance
    const linkBalance = await linkToken.balanceOf(TESTER_ADDRESS);
    console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
    
    if (linkBalance.eq(0)) {
        console.error("❌ Contract has no LINK tokens. Please fund it first.");
        return;
    }
    
    // Check current allowance
    const currentAllowance = await linkToken.allowance(TESTER_ADDRESS, VRF_WRAPPER);
    console.log(`\n📊 Current LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(currentAllowance)} LINK`);
    
    // If allowance is not sufficient, approve more LINK tokens
    if (currentAllowance.lt(ethers.utils.parseEther("1.0"))) {
        console.log("\n🔄 Approving LINK tokens for VRF Wrapper...");
        
        try {
            const tx = await spinTester.approveLINK(VRF_WRAPPER, ethers.utils.parseEther("10.0"));
            console.log(`Transaction hash: ${tx.hash}`);
            console.log("Waiting for confirmation...");
            
            const receipt = await tx.wait();
            console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
            
            // Check new allowance
            const newAllowance = await linkToken.allowance(TESTER_ADDRESS, VRF_WRAPPER);
            console.log(`\n📊 New LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(newAllowance)} LINK`);
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            return;
        }
    }
    
    // Make VRF request with LINK payment
    console.log("\n🎲 Making VRF request with LINK payment...");
    
    try {
        // Call the test_VRFRequestWithLINK function
        const tx = await spinTester.test_VRFRequestWithLINK();
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Get the request ID from the events
        const requestId = receipt.events.find(e => e.event === "RandomWordsRequested")?.args?.requestId;
        console.log(`\n📝 Request ID: ${requestId}`);
        
        console.log("\n⏳ Waiting for VRF response (this may take a minute)...");
        console.log("You can check the request status later using the request ID.");
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        console.log("\nThe transaction failed. This could be due to:");
        console.log("1. Insufficient LINK tokens");
        console.log("2. Incorrect contract configuration");
        console.log("3. Issues with the VRF wrapper");
        console.log("\nCheck the error message for more details.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 