const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("===========================================");
  console.log("Verifying Contracts on Sepolia Etherscan");
  console.log("===========================================\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "../../addresses/sepolia.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ addresses/sepolia.json not found!");
    console.error("Please run the deployment script first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📄 Loaded deployment from:", deploymentPath);
  console.log("📅 Deployment date:", deployment.deployedAt);
  
  // Get deployer from etherscan (since we don't store it in the simplified format)
  const deployer = process.env.LEDGER_ACCOUNT || "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86";
  console.log("👤 Deployer:", deployer, "\n");

  // Verify each contract
  const results = [];

  // 1. Verify GovernanceToken
  console.log("1️⃣  Verifying GovernanceToken...");
  console.log("   Address:", deployment.contracts.GovernanceToken);
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.GovernanceToken,
      constructorArguments: [deployer],
    });
    console.log("   ✅ GovernanceToken verified!\n");
    results.push({ contract: "GovernanceToken", status: "success" });
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("   ✅ GovernanceToken already verified!\n");
      results.push({ contract: "GovernanceToken", status: "already verified" });
    } else {
      console.log("   ❌ GovernanceToken verification failed:", error.message, "\n");
      results.push({ contract: "GovernanceToken", status: "failed", error: error.message });
    }
  }

  // 2. Verify Timelock
  console.log("2️⃣  Verifying Timelock...");
  console.log("   Address:", deployment.contracts.Timelock);
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.Timelock,
      constructorArguments: [
        3600, // minDelay - 1 hour
        [deployer], // proposers
        [hre.ethers.ZeroAddress], // executors (anyone)
        deployer // admin
      ],
    });
    console.log("   ✅ Timelock verified!\n");
    results.push({ contract: "Timelock", status: "success" });
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("   ✅ Timelock already verified!\n");
      results.push({ contract: "Timelock", status: "already verified" });
    } else {
      console.log("   ❌ Timelock verification failed:", error.message, "\n");
      results.push({ contract: "Timelock", status: "failed", error: error.message });
    }
  }

  // 3. Verify DAOGovernor
  console.log("3️⃣  Verifying DAOGovernor...");
  console.log("   Address:", deployment.contracts.DAOGovernor);
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.DAOGovernor,
      constructorArguments: [
        deployment.contracts.GovernanceToken,
        deployment.contracts.Timelock,
        6545, // votingDelay
        45818, // votingPeriod
        hre.ethers.parseEther("1") // proposalThreshold
      ],
    });
    console.log("   ✅ DAOGovernor verified!\n");
    results.push({ contract: "DAOGovernor", status: "success" });
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("   ✅ DAOGovernor already verified!\n");
      results.push({ contract: "DAOGovernor", status: "already verified" });
    } else {
      console.log("   ❌ DAOGovernor verification failed:", error.message, "\n");
      results.push({ contract: "DAOGovernor", status: "failed", error: error.message });
    }
  }

  // Summary
  console.log("===========================================");
  console.log("📊 Verification Summary");
  console.log("===========================================");
  results.forEach(result => {
    const icon = result.status === "success" || result.status === "already verified" ? "✅" : "❌";
    console.log(`${icon} ${result.contract}: ${result.status}`);
  });

  console.log("\n🔗 View contracts on Sepolia Etherscan:");
  console.log(`   GovernanceToken: https://sepolia.etherscan.io/address/${deployment.contracts.GovernanceToken}`);
  console.log(`   Timelock: https://sepolia.etherscan.io/address/${deployment.contracts.Timelock}`);
  console.log(`   DAOGovernor: https://sepolia.etherscan.io/address/${deployment.contracts.DAOGovernor}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification script failed!");
    console.error(error);
    process.exit(1);
  });