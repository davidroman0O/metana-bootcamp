const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔬 Running Upgradable SpinTester Tests");
    console.log("=========================");
    
    // Load tester deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ Upgradable SpinTester deployment not found at ${deploymentPath}`);
        console.error("Please run upgradable-spin-test-deploy.js first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const TESTER_ADDRESS = deployment.proxy;
    const LINK_TOKEN = deployment.constructorArgs[2]; // Third argument is LINK token
    
    console.log(`🧪 Upgradable SpinTester address: ${TESTER_ADDRESS}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${signer.address}`);
    
    // Get contract instances
    const spinTester = await ethers.getContractAt("UpgradableSpinTester", TESTER_ADDRESS);
    const linkToken = await ethers.getContractAt("IERC20", LINK_TOKEN);
    
    // Check balances
    const ethBalance = await ethers.provider.getBalance(TESTER_ADDRESS);
    const linkBalance = await linkToken.balanceOf(TESTER_ADDRESS);
    const linkDecimals = 18; // LINK has 18 decimals
    
    console.log(`\n💰 Contract balances:`);
    console.log(`ETH: ${ethers.utils.formatEther(ethBalance)} ETH`);
    console.log(`LINK: ${ethers.utils.formatUnits(linkBalance, linkDecimals)} LINK`);
    
    if (ethBalance.eq(0) || linkBalance.eq(0)) {
        console.error("❌ Contract needs both ETH and LINK to run tests.");
        console.error("Please fund the contract first using the funding scripts.");
        return;
    }
    
    console.log("\n🧪 Running all tests:");
    
    // Test 0: Price Feeds
    console.log("\n------- Test #0: Price Feeds -------");
    console.log("Testing price feeds connection...");
    const priceFeedTest = await spinTester.test_PriceFeeds();
    const priceFeedReceipt = await priceFeedTest.wait();
    
    // Find TestCompleted event
    const testCompletedEvents = priceFeedReceipt.events.filter(e => 
        e.event === "TestCompleted" && e.args && e.args.testName === "PriceFeeds"
    );
    
    if (testCompletedEvents.length > 0) {
        const event = testCompletedEvents[0];
        const success = event.args.success;
        const details = event.args.details;
        console.log(`Result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
        console.log(`Details: ${details}`);
        
        if (success && details.includes("ETH:") && details.includes("LINK:")) {
            const ethPrice = parseInt(details.split("ETH: ")[1].split(",")[0]);
            const linkPrice = parseInt(details.split("LINK: ")[1]);
            console.log(`ETH price: $${ethPrice/1e8}`);
            console.log(`LINK price: $${linkPrice/1e8}`);
        }
    } else {
        console.log("❌ No test result event found");
    }
    
    // Test 1: VRF Cost in USD
    console.log("\n------- Test #1: VRF Cost in USD -------");
    console.log("Testing VRF cost calculation...");
    const vrfCostTest = await spinTester.test_VRFCostInUSD();
    const vrfCostReceipt = await vrfCostTest.wait();
    await processTestResult(vrfCostReceipt, "VRFCostInUSD", (details) => {
        console.log(`Details: VRF Cost = ${details} USD cents`);
    });
    
    // Test 2: USD to ETH Conversion
    console.log("\n------- Test #2: USD to ETH Conversion -------");
    console.log("Testing USD to ETH conversion...");
    const usdToEthTest = await spinTester.test_USDtoETHConversion(100); // $1.00
    const usdToEthReceipt = await usdToEthTest.wait();
    await processTestResult(usdToEthReceipt, "USDtoETHConversion", (details) => {
        console.log(`Details: $1.00 = ${ethers.utils.formatEther(details)} ETH`);
    });
    
    // Test 3: ETH to LINK Swap
    console.log("\n------- Test #3: ETH to LINK Swap -------");
    console.log("Testing ETH to LINK swap...");
    const swapTest = await spinTester.test_ETHtoLINKSwap(ethers.utils.parseEther("0.001"));
    const swapReceipt = await swapTest.wait();
    await processTestResult(swapReceipt, "ETHtoLINKSwap");
    
    // Test 4: Full Spin Flow
    console.log("\n------- Test #4: Full Spin Flow -------");
    console.log("Testing full spin flow...");
    const spinTest = await spinTester.test_FullSpinFlow(3); // 3 reels
    const spinReceipt = await spinTest.wait();
    await processTestResult(spinReceipt, "FullSpinFlow");
    
    console.log("\n✅ All tests completed!");
}

// Helper function to process test results
async function processTestResult(receipt, testName, detailsFormatter = null) {
    const testCompletedEvents = receipt.events.filter(e => 
        e.event === "TestCompleted" && e.args && e.args.testName === testName
    );
    
    if (testCompletedEvents.length > 0) {
        const event = testCompletedEvents[0];
        const success = event.args.success;
        const details = event.args.details;
        console.log(`Result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
        
        if (detailsFormatter) {
            detailsFormatter(details);
        } else {
            console.log(`Details: ${details}`);
        }
    } else {
        console.log("❌ No test result event found");
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 