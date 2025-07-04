const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔍 Checking VRF Configuration");
    console.log("============================");
    
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
    
    // Get SpinTester contract
    const spinTester = await ethers.getContractAt("SpinTester", TESTER_ADDRESS);
    
    // Get VRF parameters
    const callbackGasLimit = await spinTester.callbackGasLimit();
    const requestConfirmations = await spinTester.requestConfirmations();
    const numWords = await spinTester.numWords();
    const vrfCostLINK = await spinTester.vrfCostLINK();
    
    // Get VRF wrapper address
    const vrfWrapperAddress = await spinTester.getVRFWrapperAddress();
    
    // Get LINK token address
    const linkTokenAddress = await spinTester.linkToken();
    
    // Get LINK balance and allowance
    const linkToken = await ethers.getContractAt("IERC20", linkTokenAddress);
    const linkBalance = await linkToken.balanceOf(TESTER_ADDRESS);
    const linkAllowance = await linkToken.allowance(TESTER_ADDRESS, vrfWrapperAddress);
    
    // VRF V2.5 Wrapper address for Sepolia
    const V2_5_WRAPPER = "0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1";
    const V2_WRAPPER = "0xab18414CD93297B0d12ac29E63Ca20f515b3DB46";
    
    console.log("\n📊 VRF Configuration:");
    console.log(`Callback Gas Limit: ${callbackGasLimit.toString()}`);
    console.log(`Request Confirmations: ${requestConfirmations.toString()}`);
    console.log(`Num Words: ${numWords.toString()}`);
    console.log(`VRF Cost LINK: ${ethers.utils.formatUnits(vrfCostLINK, 18)} LINK`);
    
    console.log("\n🔗 Contract Addresses:");
    console.log(`VRF Wrapper Address: ${vrfWrapperAddress}`);
    console.log(`LINK Token Address: ${linkTokenAddress}`);
    
    console.log("\n💰 LINK Status:");
    console.log(`LINK Balance: ${ethers.utils.formatUnits(linkBalance, 18)} LINK`);
    console.log(`LINK Allowance for VRF Wrapper: ${ethers.utils.formatUnits(linkAllowance, 18)} LINK`);
    
    console.log("\n🔄 VRF Version Check:");
    if (vrfWrapperAddress.toLowerCase() === V2_5_WRAPPER.toLowerCase()) {
        console.log("✅ Using VRF V2.5 Wrapper");
    } else if (vrfWrapperAddress.toLowerCase() === V2_WRAPPER.toLowerCase()) {
        console.log("⚠️ Using VRF V2 Wrapper (outdated)");
    } else {
        console.log("❌ Unknown VRF Wrapper address");
    }
    
    // Check if the contract has enough LINK
    const MIN_LINK = ethers.utils.parseUnits("2", 18); // 2 LINK minimum for VRF V2.5
    if (linkBalance.lt(MIN_LINK)) {
        console.log("\n⚠️ LINK balance may be too low for VRF V2.5");
        console.log(`Current balance: ${ethers.utils.formatUnits(linkBalance, 18)} LINK`);
        console.log("Recommended minimum: 2.0 LINK");
    } else {
        console.log("\n✅ LINK balance is sufficient");
    }
    
    // Check if allowance is sufficient
    if (linkAllowance.lt(MIN_LINK)) {
        console.log("\n⚠️ LINK allowance may be too low for VRF V2.5");
        console.log(`Current allowance: ${ethers.utils.formatUnits(linkAllowance, 18)} LINK`);
        console.log("Recommended minimum: 2.0 LINK");
    } else {
        console.log("✅ LINK allowance is sufficient");
    }
    
    console.log("\n💡 Recommendation:");
    console.log("For VRF V2.5, ensure you're using the correct wrapper pattern.");
    console.log("Check that the contract is using VRFV2PlusWrapperConsumerBase instead of VRFV2WrapperConsumerBase.");
    console.log("The VRF cost in LINK should account for both the flat fee (0.25 LINK) and gas costs.");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 