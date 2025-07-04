// Script to check VRF fulfillment status on UpgradableSpinTester
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Check if request ID is provided as an environment variable or command line argument
  let requestId = process.env.REQUEST_ID;
  
  // Check command line arguments
  if (!requestId && process.argv.length > 2) {
    requestId = process.argv[process.argv.length - 1];
    // Make sure it's not a hardhat parameter
    if (requestId.startsWith('--')) {
      requestId = null;
    }
  }
  
  if (!requestId) {
    console.error("❌ Please provide a request ID as an environment variable or command line argument");
    console.error("Example: REQUEST_ID=123456789 npx hardhat run scripts/upgradable-spin-test-check-vrf.js --network sepolia");
    console.error("Or: npx hardhat run scripts/upgradable-spin-test-check-vrf.js --network sepolia 123456789");
    process.exit(1);
  }

  console.log(`\n🔍 Checking VRF Request Status for ID: ${requestId}`);
  console.log("=======================================");
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment file not found: ${deploymentPath}`);
    console.error("Please run the deployment script first");
    process.exit(1);
  }
  
  const deployment = require(deploymentPath);
  const CONTRACT_ADDRESS = deployment.spinTester.proxy;
  
  console.log(`🧪 Contract address: ${CONTRACT_ADDRESS}`);
  
  // Get contract instance
  const tester = await ethers.getContractAt("UpgradableSpinTester", CONTRACT_ADDRESS);
  
  // Get VRF result
  try {
    const result = await tester.getVRFResult(requestId);
    const fulfilled = result[0];
    const randomWords = result[1];
    const paid = result[2];
    const nativePayment = result[3];
    const requester = result[4];
    const timestamp = result[5];
    
    console.log(`\n📊 VRF Request Status:`);
    console.log(`Request ID: ${requestId}`);
    console.log(`Fulfilled: ${fulfilled ? "✅ Yes" : "❌ No"}`);
    console.log(`Payment method: ${nativePayment ? "Native ETH" : "LINK token"}`);
    console.log(`Amount paid: ${ethers.utils.formatEther(paid)} ${nativePayment ? "ETH" : "LINK"}`);
    console.log(`Requester: ${requester}`);
    console.log(`Timestamp: ${new Date(timestamp.toNumber() * 1000).toISOString()}`);
    
    if (fulfilled) {
      console.log(`\n🎲 Random values:`);
      for (let i = 0; i < randomWords.length; i++) {
        console.log(`Word ${i+1}: ${randomWords[i].toString()}`);
      }
      
      // If we have at least one random word, show some derived values
      if (randomWords.length > 0) {
        const randomValue = randomWords[0];
        console.log(`\n🎮 Sample derived values (for 3-reel slot):`);
        
        // Generate 3 reels (values 1-6)
        const reels = [];
        for (let i = 0; i < 3; i++) {
          // Extract 8 bits for each reel, then mod 6 to get 1-6
          const reelValue = ((randomValue.shr(i * 8)).mod(6)).add(1);
          reels.push(reelValue.toString());
        }
        
        console.log(`Reels: [${reels.join(', ')}]`);
      }
    } else {
      console.log(`\n⏳ Request is not fulfilled yet. Please check again later.`);
      console.log(`You can check the status on Etherscan:`);
      console.log(`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`);
    }
  } catch (error) {
    console.error(`❌ Error checking VRF result: ${error.message}`);
    console.log(`The request ID ${requestId} may not exist or there might be an issue with the contract.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 