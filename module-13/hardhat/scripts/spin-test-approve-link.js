const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🔄 Approving LINK tokens for VRF Wrapper");
    console.log("======================================");
    
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
    
    // If allowance is already sufficient, no need to approve again
    if (currentAllowance.gte(ethers.utils.parseEther("1.0"))) {
        console.log("✅ Allowance is already sufficient. No need to approve more LINK tokens.");
        return;
    }
    
    // Approve LINK tokens for the VRF wrapper
    console.log("\n🔄 Approving LINK tokens for VRF Wrapper...");
    
    try {
        // We need to call the approve function from the SpinTester contract
        // Create a custom function to approve LINK tokens
        const tx = await spinTester.approveLINK(VRF_WRAPPER, ethers.utils.parseEther("10.0"));
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Check new allowance
        const newAllowance = await linkToken.allowance(TESTER_ADDRESS, VRF_WRAPPER);
        console.log(`\n📊 New LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(newAllowance)} LINK`);
        
        console.log("\n✅ Successfully approved LINK tokens for VRF Wrapper!");
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        console.log("\n⚠️ The SpinTester contract needs an approveLINK function to approve LINK tokens for the VRF wrapper.");
        console.log("Please add this function to the contract and redeploy it.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 