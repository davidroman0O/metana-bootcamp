const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🔍 Checking VRF Wrapper Address");
    console.log("=============================");
    
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
    console.log(`🎲 Expected VRF Wrapper address: ${VRF_WRAPPER}`);
    
    // Get contract instance
    const spinTester = await ethers.getContractAt("SpinTester", TESTER_ADDRESS);
    
    // Get VRF wrapper address from contract
    const actualVRFWrapper = await spinTester.getVRFWrapperAddress();
    console.log(`🎲 Actual VRF Wrapper address: ${actualVRFWrapper}`);
    
    // Check if they match
    if (actualVRFWrapper.toLowerCase() === VRF_WRAPPER.toLowerCase()) {
        console.log("✅ VRF Wrapper addresses match!");
    } else {
        console.log("❌ VRF Wrapper addresses DO NOT match!");
        console.log("This could be the cause of the LINK payment issues.");
    }
    
    // Check LINK allowance
    const linkToken = await ethers.getContractAt("IERC20", LINK_TOKEN);
    const allowance = await linkToken.allowance(TESTER_ADDRESS, VRF_WRAPPER);
    console.log(`\n📊 LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(allowance)} LINK`);
    
    // Check LINK balance
    const linkBalance = await linkToken.balanceOf(TESTER_ADDRESS);
    console.log(`💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 