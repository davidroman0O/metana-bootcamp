const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔍 Checking Contract Owner");
    console.log("=======================");
    
    // Load deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ Deployment file not found: ${deploymentPath}`);
        console.error("Please run the deployment script first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const CONTRACT_ADDRESS = deployment.spinTester.proxy;
    const LINK_TOKEN = deployment.parameters.linkToken;
    const VRF_WRAPPER = deployment.parameters.vrfWrapper;
    
    console.log(`🧪 Contract address: ${CONTRACT_ADDRESS}`);
    console.log(`🔗 LINK token address: ${LINK_TOKEN}`);
    console.log(`🎲 VRF Wrapper address: ${VRF_WRAPPER}`);

    // Get contract instance
    const tester = await ethers.getContractAt("UpgradableSpinTester", CONTRACT_ADDRESS);
    
    // Get contract owner
    const owner = await tester.owner();
    console.log(`\n👤 Contract owner: ${owner}`);
    
    // Get current signer
    const [signer] = await ethers.getSigners();
    console.log(`👤 Current signer: ${signer.address}`);
    
    // Check if the signer is the owner
    const isOwner = owner.toLowerCase() === signer.address.toLowerCase();
    console.log(`👤 Is signer the owner? ${isOwner ? "✅ Yes" : "❌ No"}`);
    
    // Get LINK token contract
    const linkToken = await ethers.getContractAt("LinkTokenInterface", LINK_TOKEN);
    
    // Check LINK balance
    const linkBalance = await linkToken.balanceOf(CONTRACT_ADDRESS);
    console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
    
    // Check LINK allowance
    const linkAllowance = await linkToken.allowance(CONTRACT_ADDRESS, VRF_WRAPPER);
    console.log(`\n🔑 LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(linkAllowance)} LINK`);
    
    // Check if the contract has an approveLINK function
    console.log(`\n🔍 Checking if contract has approveLINK function...`);
    let hasApproveLINK = false;
    try {
        if (tester.approveLINK) {
            hasApproveLINK = true;
            console.log(`✅ Contract has approveLINK function`);
        }
    } catch (e) {
        console.log(`❌ Contract does not have approveLINK function`);
    }
    
    // Explain the issue
    console.log(`\n🔧 Understanding the issue:`);
    console.log(`1. The contract has ${ethers.utils.formatEther(linkBalance)} LINK tokens`);
    console.log(`2. The contract has approved ${ethers.utils.formatEther(linkAllowance)} LINK tokens for the VRF wrapper`);
    console.log(`3. When the contract tries to use transferAndCall in _requestRandomWordsWithLINK, it fails with "ERC20: transfer amount exceeds balance"`);
    console.log(`4. This is likely because transferAndCall is trying to transfer LINK tokens directly from the contract to the VRF wrapper`);
    console.log(`5. Unlike approve, transferAndCall requires the contract to actually have the LINK tokens`);
    
    console.log(`\n🔧 Recommended solution:`);
    console.log(`1. Continue using the native ETH payment method for now, which is working correctly`);
    console.log(`2. If you need to use LINK payment, you'll need to fix the _requestRandomWordsWithLINK function`);
    console.log(`3. The issue is likely in how transferAndCall is being used. It's trying to transfer LINK tokens directly from the contract to the VRF wrapper`);
    console.log(`4. This is different from how the VRFV2PlusWrapperConsumerBase contract handles it`);
    console.log(`5. The VRFV2PlusWrapperConsumerBase contract uses transferAndCall correctly, but your custom implementation might have an issue`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 