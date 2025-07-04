const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔧 Fixing LINK Payment for VRF");
    console.log("============================");
    
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
    
    // Get current VRF parameters
    const callbackGasLimit = await tester.callbackGasLimit();
    const requestConfirmations = await tester.requestConfirmations();
    const numWords = await tester.numWords();
    const vrfCostLINK = await tester.vrfCostLINK();
    const vrfCostETH = await tester.vrfCostETH();
    
    console.log(`\n⚙️ Current VRF Parameters:`);
    console.log(`Callback Gas Limit: ${callbackGasLimit}`);
    console.log(`Request Confirmations: ${requestConfirmations}`);
    console.log(`Number of Words: ${numWords}`);
    console.log(`VRF Cost in LINK: ${ethers.utils.formatEther(vrfCostLINK)} LINK`);
    console.log(`VRF Cost in ETH: ${ethers.utils.formatEther(vrfCostETH)} ETH`);
    
    // Set a non-zero LINK cost
    const newLinkCost = ethers.utils.parseEther("0.001"); // 0.001 LINK
    
    console.log(`\n🔄 Updating VRF parameters with non-zero LINK cost (${ethers.utils.formatEther(newLinkCost)} LINK)...`);
    
    try {
        const tx = await tester.updateVRFParameters(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            newLinkCost,
            vrfCostETH
        );
        
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Check new VRF parameters
        const newVrfCostLINK = await tester.vrfCostLINK();
        console.log(`\n💸 New VRF cost in LINK: ${ethers.utils.formatEther(newVrfCostLINK)} LINK`);
        
        // Test the VRF request with LINK payment
        console.log(`\n🔄 Testing VRF request with LINK payment...`);
        
        try {
            const testTx = await tester.test_VRFRequestWithLINK();
            console.log(`Test transaction hash: ${testTx.hash}`);
            console.log("Waiting for confirmation...");
            
            const testReceipt = await testTx.wait();
            console.log(`✅ Test transaction confirmed in block ${testReceipt.blockNumber}`);
            
            // Check for events
            let requestId = null;
            for (const event of testReceipt.events || []) {
                if (event.event === "TestCompleted") {
                    const [testName, success, result] = event.args;
                    console.log(`\n📝 Test result: ${testName} - Success: ${success} - Result: ${result}`);
                } else if (event.event === "RandomWordsRequested") {
                    requestId = event.args.requestId;
                    console.log(`\n📝 VRF Request ID: ${requestId}`);
                }
            }
            
            if (requestId) {
                console.log(`\n⏳ VRF request submitted! You can check the status later using:`);
                console.log(`REQUEST_ID=${requestId} npx hardhat run scripts/upgradable-spin-test-check-vrf.js --network ${network.name}`);
            }
        } catch (error) {
            console.error(`\n❌ Test error: ${error.message}`);
            
            if (error.message.includes("ERC20: transfer amount exceeds balance")) {
                console.log(`\n⚠️ The contract doesn't have enough LINK tokens or hasn't approved the VRF wrapper.`);
                console.log(`Let's check the LINK balance and allowance...`);
                
                // Get LINK token contract
                const linkToken = await ethers.getContractAt("LinkTokenInterface", LINK_TOKEN);
                
                // Check LINK balance
                const linkBalance = await linkToken.balanceOf(CONTRACT_ADDRESS);
                console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
                
                // Check LINK allowance
                const linkAllowance = await linkToken.allowance(CONTRACT_ADDRESS, VRF_WRAPPER);
                console.log(`\n🔑 LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(linkAllowance)} LINK`);
                
                if (linkAllowance.lt(newLinkCost)) {
                    console.log(`\n⚠️ The contract hasn't approved enough LINK tokens for the VRF wrapper.`);
                    console.log(`The issue is in the _requestRandomWordsWithLINK function. It's trying to use transferAndCall but the approval isn't working.`);
                    console.log(`\n🔧 Recommended solution: Use native ETH payment instead of LINK payment for now.`);
                }
            }
        }
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