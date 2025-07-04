// Script to test VRF request with LINK payment on UpgradableSpinTester
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔄 Testing VRF with LINK Payment");
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
  
  console.log(`🧪 Contract address: ${CONTRACT_ADDRESS}`);
  console.log(`🔗 LINK token address: ${LINK_TOKEN}`);
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`\n🔑 Signer: ${signer.address}`);
  
  // Get contract instance
  const tester = await ethers.getContractAt("UpgradableSpinTester", CONTRACT_ADDRESS);
  
  // Check LINK balance
  const linkToken = await ethers.getContractAt("IERC20", LINK_TOKEN);
  const linkBalance = await linkToken.balanceOf(CONTRACT_ADDRESS);
  console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
  
  if (linkBalance.eq(0)) {
    console.error("❌ Contract needs LINK to run this test.");
    console.error("Please fund the contract first using the funding script.");
    return;
  }
  
  // Test VRF with LINK payment
  console.log("\n🔄 Requesting random number with LINK payment...");
  
  try {
    const tx = await tester.test_VRFRequestWithLINK({
      gasLimit: 500000 // Increased gas limit for LINK payment
    });
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Find the TestCompleted event
    const testCompletedEvent = receipt.events.find(
      (e) => e.event === "TestCompleted" && e.args[0] === "VRFRequestWithLINK"
    );
    
    if (testCompletedEvent) {
      const [testName, success, details] = testCompletedEvent.args;
      console.log(`\nTest Result: ${success ? "✅ PASSED" : "❌ FAILED"}`);
      console.log(`Details: ${details}`);
    }
    
    // Find the RandomWordsRequested event
    const randomWordsRequestedEvent = receipt.events.find(
      (e) => e.event === "RandomWordsRequested"
    );
    
    if (randomWordsRequestedEvent) {
      const requestId = randomWordsRequestedEvent.args.requestId;
      console.log(`\n📝 Request ID: ${requestId.toString()}`);
      console.log(`To check the status: REQUEST_ID=${requestId.toString()} npx hardhat run scripts/upgradable-spin-test-check-vrf.js --network sepolia`);
    }
    
    console.log("\n⏳ Waiting for VRF fulfillment...");
    console.log("You can check the status later using:");
    console.log(`npx hardhat run scripts/upgradable-spin-test-check-vrf.js --network sepolia ${randomWordsRequestedEvent ? randomWordsRequestedEvent.args.requestId.toString() : ''}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 