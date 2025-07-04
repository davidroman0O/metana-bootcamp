const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔍 Debugging LINK Payment for VRF");
    console.log("=============================");
    
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
    
    // Check LINK balance
    const linkBalance = await linkToken.balanceOf(CONTRACT_ADDRESS);
    console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
    
    // Check VRF parameters
    const callbackGasLimit = await tester.callbackGasLimit();
    const requestConfirmations = await tester.requestConfirmations();
    const numWords = await tester.numWords();
    const vrfCostLINK = await tester.vrfCostLINK();
    
    console.log(`\n⚙️ VRF Parameters:`);
    console.log(`Callback Gas Limit: ${callbackGasLimit}`);
    console.log(`Request Confirmations: ${requestConfirmations}`);
    console.log(`Number of Words: ${numWords}`);
    console.log(`VRF Cost in LINK: ${ethers.utils.formatEther(vrfCostLINK)} LINK`);
    
    // Get VRF wrapper price
    const vrfWrapperInterface = new ethers.utils.Interface([
        "function calculateRequestPrice(uint32 _callbackGasLimit, uint32 _numWords) external view returns (uint256)"
    ]);
    const vrfWrapper = new ethers.Contract(VRF_WRAPPER, vrfWrapperInterface, ethers.provider);
    
    try {
        const actualPrice = await vrfWrapper.calculateRequestPrice(callbackGasLimit, numWords);
        console.log(`\n📊 Actual VRF request price: ${ethers.utils.formatEther(actualPrice)} LINK`);
        
        // Check if the contract has enough LINK
        if (linkBalance.lt(actualPrice)) {
            console.log(`\n⚠️ Contract doesn't have enough LINK! Needs ${ethers.utils.formatEther(actualPrice)} but has ${ethers.utils.formatEther(linkBalance)}`);
        } else {
            console.log(`\n✅ Contract has enough LINK for VRF request`);
        }
        
        // Set a minimum non-zero price if actual price is zero or very small
        let priceToUse = actualPrice;
        if (actualPrice.isZero() || actualPrice.lt(ethers.utils.parseEther("0.0001"))) {
            priceToUse = ethers.utils.parseEther("0.0001"); // Use a small non-zero amount
            console.log(`\n⚠️ Actual price is zero or very small, using ${ethers.utils.formatEther(priceToUse)} LINK instead`);
            
            // Update VRF parameters with non-zero price
            const vrfCostETH = await tester.vrfCostETH();
            const tx = await tester.updateVRFParameters(
                callbackGasLimit,
                requestConfirmations,
                numWords,
                priceToUse,
                vrfCostETH
            );
            
            console.log(`Transaction hash: ${tx.hash}`);
            console.log("Waiting for confirmation...");
            
            const receipt = await tx.wait();
            console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
            
            // Check new VRF cost
            const newVrfCostLINK = await tester.vrfCostLINK();
            console.log(`\n💸 New VRF cost in LINK: ${ethers.utils.formatEther(newVrfCostLINK)} LINK`);
        }
        
        // Check LINK allowance
        const linkAllowance = await linkToken.allowance(CONTRACT_ADDRESS, VRF_WRAPPER);
        console.log(`\n🔑 LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(linkAllowance)} LINK`);
        
        // Check if the contract has its own approval function
        const contractCode = await ethers.provider.getCode(CONTRACT_ADDRESS);
        console.log(`\n🔍 Checking contract code for approval function...`);
        
        // Look for the _requestRandomWordsWithLINK function to see how it handles approvals
        console.log(`\n📝 Analyzing _requestRandomWordsWithLINK implementation...`);
        
        // Simulate a call to _requestRandomWordsWithLINK to see what happens
        console.log(`\n🔄 Simulating _requestRandomWordsWithLINK call...`);
        
        try {
            // Use callStatic to simulate the call without sending a transaction
            const result = await tester.callStatic.test_VRFRequestWithLINK();
            console.log(`\n✅ Simulation successful! Result:`, result);
        } catch (error) {
            console.error(`\n❌ Simulation error: ${error.message}`);
            
            // Check if this is an approval error
            if (error.message.includes("approve") || error.message.includes("allowance")) {
                console.log(`\n⚠️ This appears to be an approval error. The contract needs to approve LINK tokens for the VRF wrapper.`);
            }
        }
        
        // Check if we need to modify the contract to fix the LINK payment issue
        console.log(`\n🔧 Checking if we need to modify the contract...`);
        
        // Check if the contract has a function to approve LINK tokens
        let hasApproveFunction = false;
        try {
            // Check if the contract has a function to approve LINK tokens
            const functionSignature = ethers.utils.id("approveLINK(address,uint256)").slice(0, 10);
            hasApproveFunction = contractCode.includes(functionSignature.slice(2));
            
            if (hasApproveFunction) {
                console.log(`\n✅ Contract has an approveLINK function!`);
            } else {
                console.log(`\n⚠️ Contract does not have an approveLINK function.`);
            }
        } catch (error) {
            console.error(`\n❌ Error checking for approveLINK function: ${error.message}`);
        }
        
        // Suggest a fix
        console.log(`\n🔧 Suggested fix:`);
        
        if (!hasApproveFunction) {
            console.log(`1. Add an approveLINK function to the contract:`);
            console.log(`
    function approveLINK(address spender, uint256 amount) external onlyOwner {
        linkToken.approve(spender, amount);
    }
            `);
        }
        
        console.log(`2. Update the _requestRandomWordsWithLINK function to use a non-zero amount:`);
        console.log(`
    function _requestRandomWordsWithLINK() external returns (uint256 requestId, uint256 price) {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        );
        
        price = vrfWrapper.calculateRequestPrice(callbackGasLimit, numWords);
        
        // Ensure price is not zero
        if (price == 0) {
            price = 100000; // Use a small non-zero amount (0.0000000000001 LINK)
        }
        
        // Approve LINK transfer if needed
        if (linkToken.allowance(address(this), address(vrfWrapper)) < price) {
            linkToken.approve(address(vrfWrapper), type(uint256).max);
        }
        
        // Transfer LINK and call the wrapper
        linkToken.transferAndCall(
            address(vrfWrapper),
            price,
            abi.encode(callbackGasLimit, requestConfirmations, numWords, extraArgs)
        );
        
        requestId = vrfWrapper.lastRequestId();
        return (requestId, price);
    }
        `);
        
        // Test the VRF request with LINK payment
        console.log(`\n🔄 Testing VRF request with LINK payment...`);
        
        try {
            const testTx = await tester.test_VRFRequestWithLINK();
            console.log(`Test transaction hash: ${testTx.hash}`);
            console.log("Waiting for confirmation...");
            
            const testReceipt = await testTx.wait();
            console.log(`✅ Test transaction confirmed in block ${testReceipt.blockNumber}`);
            
            // Check for events
            for (const event of testReceipt.events || []) {
                if (event.event === "TestCompleted") {
                    const [testName, success, result] = event.args;
                    console.log(`\n📝 Test result: ${testName} - Success: ${success} - Result: ${result}`);
                }
            }
        } catch (error) {
            console.error(`\n❌ Test error: ${error.message}`);
            
            // Check if this is a revert with a specific reason
            if (error.reason) {
                console.log(`\n⚠️ Revert reason: ${error.reason}`);
            }
            
            // Try to extract more information from the error
            if (error.data) {
                console.log(`\n⚠️ Error data: ${error.data}`);
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