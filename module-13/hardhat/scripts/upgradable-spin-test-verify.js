const { ethers, run, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔍 Verifying Upgradable SpinTester Contract");
  console.log("=======================================");

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Upgradable SpinTester deployment not found at ${deploymentPath}`);
    console.error("Please run upgradable-spin-test-deploy.js first");
    process.exit(1);
  }
  
  const deployment = require(deploymentPath);
  const proxyAddress = deployment.proxy;
  const implementationAddress = deployment.implementation;

  console.log(`📄 Proxy address: ${proxyAddress}`);
  console.log(`📄 Implementation address: ${implementationAddress}`);

  // Verify implementation contract
  try {
    console.log("\n🔍 Verifying implementation contract...");
    await run("verify:verify", {
      address: implementationAddress,
      // No constructor arguments for the implementation contract
      contract: "contracts/UpgradableSpinTester.sol:UpgradableSpinTester"
    });
    console.log("✅ Implementation contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Implementation contract is already verified!");
    } else {
      console.error("❌ Implementation verification failed:", error);
    }
  }

  // Verify proxy contract
  try {
    console.log("\n🔍 Verifying proxy contract...");
    await run("verify:verify", {
      address: proxyAddress,
      // Proxy contract verification might need different parameters depending on your setup
      contract: "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"
    });
    console.log("✅ Proxy contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Proxy contract is already verified!");
    } else if (error.message.includes("does not match")) {
      console.log("ℹ️ Proxy contract verification skipped: standard proxy pattern");
    } else {
      console.error("❌ Proxy verification failed:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 