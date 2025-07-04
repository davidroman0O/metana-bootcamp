const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🔄 Approving LINK tokens for VRF Wrapper");
    console.log("======================================");
    
    // Load tester deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ UpgradableSpinTester deployment not found at ${deploymentPath}`);
        console.error("Please run upgradable-spin-test-deploy.js first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const TESTER_ADDRESS = deployment.spinTester.proxy;
    const LINK_TOKEN = deployment.parameters.linkToken;
    const VRF_WRAPPER = deployment.parameters.vrfWrapper;
    
    console.log(`🧪 UpgradableSpinTester address: ${TESTER_ADDRESS}`);
    console.log(`🔗 LINK token address: ${LINK_TOKEN}`);
    console.log(`🎲 VRF Wrapper address: ${VRF_WRAPPER}`);
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${deployer.address}`);
    
    // Get contract instances
    const spinTester = await ethers.getContractAt("UpgradableSpinTester", TESTER_ADDRESS);
    const linkToken = await ethers.getContractAt("LinkTokenInterface", LINK_TOKEN);
    
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
    
    // Approve LINK tokens
    const approvalAmount = ethers.utils.parseEther("10.0"); // Approve 10 LINK tokens
    
    console.log(`\n🔄 Approving ${ethers.utils.formatEther(approvalAmount)} LINK tokens for VRF Wrapper...`);
    
    try {
        // Call the approveLINK function
        const tx = await spinTester.approveLINK(VRF_WRAPPER, approvalAmount);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Check new allowance
        const newAllowance = await linkToken.allowance(TESTER_ADDRESS, VRF_WRAPPER);
        console.log(`\n📊 New LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(newAllowance)} LINK`);
        
        console.log("\n✅ Successfully approved LINK tokens for VRF Wrapper!");
        console.log("\n🔄 Now you can test the VRF request with LINK payment:");
        console.log("npx hardhat run scripts/upgradable-spin-test-vrf-link.js --network " + network.name);
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.log("\n⚠️ If the contract doesn't have the approveLINK function, you need to upgrade it first:");
        console.log("npx hardhat run scripts/upgradable-spin-test-upgrade.js --network " + network.name);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 