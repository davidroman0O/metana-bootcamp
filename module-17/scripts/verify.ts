import { run } from "hardhat";
import { loadAddresses } from "./helpers/save-addresses";

async function main() {
  console.log("🔍 Starting contract verification...\n");

  // Get network name from command line or default to hardhat
  const networkName = process.env.HARDHAT_NETWORK || "hardhat";
  
  // Load addresses from saved file
  const addresses = loadAddresses(networkName);
  if (!addresses) {
    console.error("❌ No addresses found for network:", networkName);
    console.log("💡 Have you deployed the contracts yet?");
    return;
  }

  console.log(`Network: ${addresses.network}`);
  console.log(`Deployed at: ${addresses.deployedAt}\n`);

  // Verify each contract if address exists
  const contracts = [
    {
      name: "GovernanceToken",
      address: addresses.contracts.GovernanceToken,
      constructorArguments: [process.env.DEPLOYER_ADDRESS || "0x0000000000000000000000000000000000000000"]
    },
    {
      name: "Timelock", 
      address: addresses.contracts.Timelock,
      constructorArguments: [
        2 * 24 * 60 * 60, // 2 days
        [],
        ["0x0000000000000000000000000000000000000000"],
        process.env.DEPLOYER_ADDRESS || "0x0000000000000000000000000000000000000000"
      ]
    },
    {
      name: "DAOGovernor",
      address: addresses.contracts.DAOGovernor,
      constructorArguments: [
        addresses.contracts.GovernanceToken,
        addresses.contracts.Timelock,
        1, // voting delay
        50400, // voting period (~1 week)
        "100000000000000000000000" // 100k tokens
      ]
    }
  ];

  for (const contract of contracts) {
    if (!contract.address) {
      console.log(`⏭️  Skipping ${contract.name} (not deployed)`);
      continue;
    }

    console.log(`\n📋 Verifying ${contract.name}...`);
    console.log(`Address: ${contract.address}`);

    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
      });
      console.log(`✅ ${contract.name} verified!`);
    } catch (error: any) {
      if (error.message.includes("already verified")) {
        console.log(`✅ ${contract.name} already verified`);
      } else {
        console.log(`❌ ${contract.name} verification failed:`, error.message);
      }
    }
  }

  console.log("\n✅ Verification complete!");
}

// Execute verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });