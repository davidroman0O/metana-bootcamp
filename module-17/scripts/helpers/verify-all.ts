import { run, ethers, network } from "hardhat";
import { loadAddresses } from "./save-addresses";

async function main() {
  console.log("🔍 Verifying all contracts...\n");

  // Load addresses
  const addresses = loadAddresses(network.name);
  if (!addresses) {
    console.log("❌ No addresses found for current network");
    return;
  }

  console.log(`Network: ${addresses.network}`);
  console.log(`Deployed at: ${addresses.deployedAt}\n`);

  // Get deployer address (needed for constructor args)
  const [deployer] = await ethers.getSigners();

  // Verify each contract
  const contracts = [
    {
      name: "GovernanceToken",
      address: addresses.contracts.GovernanceToken,
      constructorArguments: [deployer.address]
    },
    {
      name: "Timelock",
      address: addresses.contracts.Timelock,
      constructorArguments: [
        2 * 24 * 60 * 60, // minDelay
        [], // proposers
        [ethers.ZeroAddress], // executors
        deployer.address // admin
      ]
    },
    {
      name: "DAOGovernor",
      address: addresses.contracts.DAOGovernor,
      constructorArguments: [
        addresses.contracts.GovernanceToken,
        addresses.contracts.Timelock,
        1, // voting delay
        50400, // voting period
        ethers.parseEther("100000") // proposal threshold
      ]
    }
  ];

  for (const contract of contracts) {
    if (!contract.address) {
      console.log(`⏭️ Skipping ${contract.name} (not deployed)`);
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