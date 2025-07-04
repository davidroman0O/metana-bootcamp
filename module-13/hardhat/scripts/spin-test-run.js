const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔬 Running SpinTester Tests");
    console.log("=========================");
    
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
    
    console.log(`🧪 SpinTester address: ${TESTER_ADDRESS}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${signer.address}`);
    
    // Get SpinTester contract
    const tester = await ethers.getContractAt("SpinTester", TESTER_ADDRESS);
    
    // Check ETH and LINK balances
    const ethBalance = await ethers.provider.getBalance(TESTER_ADDRESS);
    
    const linkToken = await ethers.getContractAt([
        "function balanceOf(address) view returns (uint256)"
    ], LINK_TOKEN);
    const linkBalance = await linkToken.balanceOf(TESTER_ADDRESS);
    
    console.log(`\n💰 Contract balances:`);
    console.log(`ETH: ${ethers.utils.formatEther(ethBalance)} ETH`);
    console.log(`LINK: ${ethers.utils.formatEther(linkBalance)} LINK`);
    
    if (ethBalance.eq(0)) {
        console.log(`\n⚠️ Contract has no ETH. Please send some ETH first!`);
        return;
    }
    
    const tests = [
        {name: "Price Feeds", fn: runPriceFeedsTest},
        {name: "VRF Cost in USD", fn: runVRFCostTest},
        {name: "USD to ETH Conversion", fn: runUSDtoETHTest},
        {name: "ETH to LINK Swap", fn: runSwapTest},
        {name: "Full Spin Flow", fn: runSpinFlowTest}
    ];
    
    // Run selected test or all tests
    const args = process.argv.slice(2);
    const testIndex = args.length > 0 ? parseInt(args[0]) : -1;
    
    if (testIndex >= 0 && testIndex < tests.length) {
        console.log(`\n🧪 Running test #${testIndex}: ${tests[testIndex].name}`);
        await tests[testIndex].fn(tester);
    } else {
        console.log(`\n🧪 Running all tests:`);
        for (let i = 0; i < tests.length; i++) {
            console.log(`\n------- Test #${i}: ${tests[i].name} -------`);
            await tests[i].fn(tester);
        }
    }
    
    console.log("\n✅ All tests completed!");
    
    // Test functions
    
    async function runPriceFeedsTest(tester) {
        console.log("Testing price feeds connection...");
        
        try {
            const tx = await tester.test_PriceFeeds();
            console.log(`Transaction hash: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            // Find TestCompleted event
            const events = receipt.events?.filter(e => e.event === "TestCompleted");
            
            if (events && events.length > 0) {
                const event = events[0];
                const [testName, success, details] = event.args;
                console.log(`Result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
                console.log(`Details: ${details}`);
            } else {
                console.log("❌ No test event found");
            }
            
            // Get the return values
            const { success, ethPrice, linkPrice } = await tester.callStatic.test_PriceFeeds();
            console.log(`ETH price: $${ethPrice / 1e8}`);
            console.log(`LINK price: $${linkPrice / 1e8}`);
            
            return success;
        } catch (error) {
            console.error(`❌ Test failed with error: ${error.message}`);
            return false;
        }
    }
    
    async function runVRFCostTest(tester) {
        console.log("Testing VRF cost calculation...");
        
        try {
            const tx = await tester.test_VRFCostInUSD();
            console.log(`Transaction hash: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            // Find TestCompleted event
            const events = receipt.events?.filter(e => e.event === "TestCompleted");
            
            if (events && events.length > 0) {
                const event = events[0];
                const [testName, success, details] = event.args;
                console.log(`Result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
                console.log(`Details: VRF Cost = ${details} USD cents`);
            } else {
                console.log("❌ No test event found");
            }
            
            return true;
        } catch (error) {
            console.error(`❌ Test failed with error: ${error.message}`);
            return false;
        }
    }
    
    async function runUSDtoETHTest(tester) {
        console.log("Testing USD to ETH conversion...");
        
        try {
            // Test with 100 cents ($1.00)
            const usdCents = 100;
            const tx = await tester.test_USDtoETHConversion(usdCents);
            console.log(`Transaction hash: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            // Find TestCompleted event
            const events = receipt.events?.filter(e => e.event === "TestCompleted");
            
            if (events && events.length > 0) {
                const event = events[0];
                const [testName, success, details] = event.args;
                console.log(`Result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
                console.log(`Details: $1.00 = ${ethers.utils.formatEther(details)} ETH`);
            } else {
                console.log("❌ No test event found");
            }
            
            return true;
        } catch (error) {
            console.error(`❌ Test failed with error: ${error.message}`);
            return false;
        }
    }
    
    async function runSwapTest(tester) {
        console.log("Testing ETH to LINK swap...");
        
        try {
            // Test with 0.001 ETH
            const ethAmount = ethers.utils.parseEther("0.001");
            
            // Check if contract has enough ETH
            const contractBalance = await ethers.provider.getBalance(TESTER_ADDRESS);
            if (contractBalance.lt(ethAmount)) {
                console.log(`⚠️ Contract doesn't have enough ETH (${ethers.utils.formatEther(contractBalance)} ETH)`);
                console.log(`⚠️ Skipping swap test`);
                return false;
            }
            
            const tx = await tester.test_ETHtoLINKSwap(ethAmount);
            console.log(`Transaction hash: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            // Find TestCompleted event
            const events = receipt.events?.filter(e => e.event === "TestCompleted");
            
            if (events && events.length > 0) {
                const event = events[0];
                const [testName, success, details] = event.args;
                console.log(`Result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
                console.log(`Details: ${details}`);
                
                return success;
            } else {
                console.log("❌ No test event found");
                return false;
            }
        } catch (error) {
            console.error(`❌ Test failed with error: ${error.message}`);
            return false;
        }
    }
    
    async function runSpinFlowTest(tester) {
        console.log("Testing full spin flow...");
        
        try {
            // We need to send some ETH with the transaction to simulate real spin
            const ethToSend = ethers.utils.parseEther("0.01");
            
            // Run with 3 reels (simplest case)
            const tx = await tester.test_FullSpinFlow(3, { value: ethToSend });
            console.log(`Transaction hash: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            // Find TestCompleted event
            const events = receipt.events?.filter(e => e.event === "TestCompleted");
            
            if (events && events.length > 0) {
                const event = events[0];
                const [testName, success, details] = event.args;
                console.log(`Result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
                console.log(`Details: ${details}`);
                
                return success;
            } else {
                console.log("❌ No test event found");
                return false;
            }
        } catch (error) {
            console.error(`❌ Test failed with error: ${error.message}`);
            // Parse the error to find specific failure points
            if (error.message.includes("revert")) {
                console.log(`Revert reason: ${error.message.split("reverted with reason string ")[1]?.split("'")[0] || "Unknown"}`);
            }
            return false;
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 