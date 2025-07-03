const { ethers, run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔍 Verifying SpinTester Contract");
  console.log("===============================");

  // Load deployment data
  const deploymentPath = path.join(__dirname, '../deployments', `spin-tester-${network.name}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ SpinTester deployment not found at ${deploymentPath}`);
    console.error("Please run spin-test-deploy.js first");
    process.exit(1);
  }
  
  const deployment = require(deploymentPath);
  const contractAddress = deployment.spinTester.address;
  
  // Get constructor arguments from parameters
  const params = deployment.parameters;
  const constructorArgs = [
    params.ethUsdPriceFeed,
    params.linkUsdPriceFeed,
    params.linkToken,
    params.vrfWrapper,
    params.uniswapRouter
  ];

  console.log(`📄 Contract address: ${contractAddress}`);
  console.log(`📝 Constructor arguments: ${constructorArgs.join(", ")}`);

  try {
    console.log("🔍 Starting verification process...");
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
      contract: "contracts/SpinTester.sol:SpinTester"
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified!");
    } else {
      console.error("❌ Verification failed:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 