const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔍 Checking LINK Balance and Approval");
    console.log("=================================");
    
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
    
    // Get LINK token contract
    const linkToken = await ethers.getContractAt("IERC20", LINK_TOKEN);
    
    // Check LINK balance
    const linkBalance = await linkToken.balanceOf(CONTRACT_ADDRESS);
    console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
    
    // Check LINK allowance
    const linkAllowance = await linkToken.allowance(CONTRACT_ADDRESS, VRF_WRAPPER);
    console.log(`🔑 LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(linkAllowance)} LINK`);
    
    // Check VRF cost
    const vrfCostLINK = await tester.vrfCostLINK();
    console.log(`💸 VRF cost in LINK: ${ethers.utils.formatEther(vrfCostLINK)} LINK`);
    
    // Get VRF wrapper price
    try {
        // Create an interface for the VRF wrapper
        const vrfWrapperInterface = new ethers.utils.Interface([
            "function calculateRequestPrice(uint32 _callbackGasLimit, uint32 _numWords) external view returns (uint256)"
        ]);
        
        // Create a contract instance
        const vrfWrapper = new ethers.Contract(VRF_WRAPPER, vrfWrapperInterface, ethers.provider);
        
        // Get the actual price
        const callbackGasLimit = await tester.callbackGasLimit();
        const numWords = await tester.numWords();
        const actualPrice = await vrfWrapper.calculateRequestPrice(callbackGasLimit, numWords);
        
        console.log(`\n📊 Actual VRF request price: ${ethers.utils.formatEther(actualPrice)} LINK`);
        
        if (actualPrice.gt(linkBalance)) {
            console.log(`\n⚠️ Contract doesn't have enough LINK! Needs ${ethers.utils.formatEther(actualPrice)} but has ${ethers.utils.formatEther(linkBalance)}`);
        } else if (actualPrice.gt(linkAllowance)) {
            console.log(`\n⚠️ Contract doesn't have enough LINK allowance! Needs ${ethers.utils.formatEther(actualPrice)} but has ${ethers.utils.formatEther(linkAllowance)} approved`);
        } else {
            console.log(`\n✅ Contract has enough LINK and allowance for VRF requests`);
        }
        
        // Compare with configured vrfCostLINK
        if (!actualPrice.eq(vrfCostLINK)) {
            console.log(`\n⚠️ Note: Contract's vrfCostLINK (${ethers.utils.formatEther(vrfCostLINK)}) does not match actual price (${ethers.utils.formatEther(actualPrice)})`);
            console.log(`Consider updating vrfCostLINK to match the actual price`);
        }
    } catch (error) {
        console.error(`❌ Error checking VRF price: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 