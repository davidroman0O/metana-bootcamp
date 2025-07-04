const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🔍 Checking VRF LINK Cost");
    console.log("======================");
    
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
    const linkToken = await ethers.getContractAt("LinkTokenInterface", LINK_TOKEN);
    
    // Get VRF parameters
    const callbackGasLimit = await tester.callbackGasLimit();
    const numWords = await tester.numWords();
    const vrfCostLINK = await tester.vrfCostLINK();
    
    console.log(`\n⚙️ VRF Parameters:`);
    console.log(`Callback Gas Limit: ${callbackGasLimit}`);
    console.log(`Number of Words: ${numWords}`);
    console.log(`VRF Cost in LINK: ${ethers.utils.formatEther(vrfCostLINK)} LINK`);
    
    // Get VRF wrapper interface
    const vrfWrapperInterface = new ethers.utils.Interface([
        "function calculateRequestPrice(uint32 _callbackGasLimit, uint32 _numWords) external view returns (uint256)"
    ]);
    
    // Create VRF wrapper contract instance
    const vrfWrapper = new ethers.Contract(VRF_WRAPPER, vrfWrapperInterface, ethers.provider);
    
    try {
        // Calculate the actual price
        const actualPrice = await vrfWrapper.calculateRequestPrice(callbackGasLimit, numWords);
        console.log(`\n📊 Actual VRF request price: ${ethers.utils.formatEther(actualPrice)} LINK`);
        
        // Check if the contract has enough LINK
        const linkBalance = await linkToken.balanceOf(CONTRACT_ADDRESS);
        console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
        
        if (linkBalance.lt(actualPrice)) {
            console.log(`\n⚠️ Contract doesn't have enough LINK! Needs ${ethers.utils.formatEther(actualPrice)} but has ${ethers.utils.formatEther(linkBalance)}`);
        } else {
            console.log(`\n✅ Contract has enough LINK for VRF request`);
        }
        
        // Check LINK allowance
        const linkAllowance = await linkToken.allowance(CONTRACT_ADDRESS, VRF_WRAPPER);
        console.log(`\n🔑 LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(linkAllowance)} LINK`);
        
        if (linkAllowance.lt(actualPrice)) {
            console.log(`\n⚠️ Contract hasn't approved enough LINK! Needs ${ethers.utils.formatEther(actualPrice)} but has ${ethers.utils.formatEther(linkAllowance)} approved`);
        } else {
            console.log(`\n✅ Contract has approved enough LINK for VRF wrapper`);
        }
        
        // Compare with configured vrfCostLINK
        if (!actualPrice.eq(vrfCostLINK)) {
            console.log(`\n⚠️ Contract's vrfCostLINK (${ethers.utils.formatEther(vrfCostLINK)}) does not match actual price (${ethers.utils.formatEther(actualPrice)})`);
            console.log(`Consider updating vrfCostLINK to match the actual price`);
        } else {
            console.log(`\n✅ Contract's vrfCostLINK matches the actual price`);
        }
        
        // Recommend next steps
        console.log(`\n🔧 Recommended next steps:`);
        
        if (actualPrice.gt(vrfCostLINK)) {
            console.log(`1. Update the contract's vrfCostLINK to ${ethers.utils.formatEther(actualPrice)} LINK`);
            console.log(`   npx hardhat run scripts/upgradable-spin-test-update-vrf-costs.js --network ${network.name}`);
        }
        
        if (linkAllowance.lt(actualPrice)) {
            console.log(`2. Approve ${ethers.utils.formatEther(actualPrice)} LINK for the VRF wrapper`);
            console.log(`   npx hardhat run scripts/upgradable-spin-test-approve-link.js --network ${network.name}`);
        }
        
        console.log(`3. Test the VRF request with LINK payment`);
        console.log(`   npx hardhat run scripts/upgradable-spin-test-vrf-link.js --network ${network.name}`);
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 