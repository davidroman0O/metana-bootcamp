const { ethers, network, run } = require("hardhat");
const { getAddresses, saveAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
require('dotenv').config();

async function main() {
  console.log(`\n▶️  Deploying Payout Tables system on '${network.name}'`);
  console.log("------------------------------------------------------");

  // Compile contracts first
  console.log("\n📦 Compiling contracts...");
  await run("compile");
  console.log("   ✅ Compilation complete");

  const [deployer] = await ethers.getSigners();
  console.log("\n  > Deployer account:", deployer.address);
  console.log("  > Account balance:", (await deployer.getBalance()).toString());

  if (network.name !== 'localhost' && network.name !== 'hardhat') {
    console.log("\n⚠️  Please ensure your Ledger is connected and unlocked.");
  }

  // Load existing addresses to resume deployment
  const existingAddresses = getAddresses(network.name, "payouts") || {};
  console.log("\n🔍 Checking for existing deployments...");
  
  const deployContract = async (name, contractKey, ...args) => {
    if (existingAddresses[contractKey]) {
      console.log(`\n   ⏭️  ${name} already deployed at: ${existingAddresses[contractKey]}`);
      return { address: existingAddresses[contractKey] };
    }
    
    console.log(`\n   -> Deploying ${name}...`);
    try {
      const ContractFactory = await ethers.getContractFactory(name);
      const contract = await withRetry(async () => await ContractFactory.deploy(...args));
      await contract.deployed();
      console.log(`   ✅ ${name} deployed to:`, contract.address);
      
      // Save immediately after each successful deployment
      existingAddresses[contractKey] = contract.address;
      saveAddresses(network.name, "payouts", existingAddresses);
      console.log(`   💾 Address saved to file`);
      
      return contract;
    } catch (error) {
      console.error(`   ❌ Failed to deploy ${name}:`, error.message);
      console.log(`   💡 You can re-run this script to resume from where it failed`);
      throw error;
    }
  };

  // Deploy all individual payout table contracts
  const payoutTables3 = await deployContract("PayoutTables3", "payoutTables3");
  const payoutTables4 = await deployContract("PayoutTables4", "payoutTables4");
  const payoutTables5 = await deployContract("PayoutTables5", "payoutTables5");
  const payoutTables6 = await deployContract("PayoutTables6", "payoutTables6");

  // Deploy all 8 PayoutTables7 chunks with resume capability
  const payoutTables7Chunks = [];
  for (let i = 1; i <= 8; i++) {
    const chunkKey = `payoutTables7_Part${i}`;
    const chunk = await deployContract(`PayoutTables7_Part${i}`, chunkKey);
    payoutTables7Chunks.push(chunk.address);
  }

  // Deploy PayoutTables7 router only if all chunks are deployed
  let payoutTables7;
  if (existingAddresses.payoutTables7Router) {
    console.log(`\n   ⏭️  PayoutTables7 router already deployed at: ${existingAddresses.payoutTables7Router}`);
    payoutTables7 = { address: existingAddresses.payoutTables7Router };
  } else {
    console.log(`\n   -> Deploying PayoutTables7 router with chunks...`);
    payoutTables7 = await deployContract("PayoutTables7", "payoutTables7Router", ...payoutTables7Chunks);
  }

  // Deploy main PayoutTables API contract with all tables
  let payoutTables;
  if (existingAddresses.payoutTablesAPI) {
    console.log(`\n   ⏭️  PayoutTables API already deployed at: ${existingAddresses.payoutTablesAPI}`);
    payoutTables = { address: existingAddresses.payoutTablesAPI };
  } else {
    console.log(`\n   -> Deploying PayoutTables API...`);
    payoutTables = await deployContract(
      "PayoutTables",
      "payoutTablesAPI",
      payoutTables3.address,
      payoutTables4.address,
      payoutTables5.address,
      payoutTables6.address,
      payoutTables7.address
    );
  }
  
  console.log("\n\n✅ All PayoutTables contracts deployed successfully!");

  // Final address summary
  console.log("\n📋 Deployment Summary:");
  console.log(`   PayoutTables API: ${existingAddresses.payoutTablesAPI}`);
  console.log(`   PayoutTables3: ${existingAddresses.payoutTables3}`);
  console.log(`   PayoutTables4: ${existingAddresses.payoutTables4}`);
  console.log(`   PayoutTables5: ${existingAddresses.payoutTables5}`);
  console.log(`   PayoutTables6: ${existingAddresses.payoutTables6}`);
  console.log(`   PayoutTables7 Router: ${existingAddresses.payoutTables7Router}`);
  for (let i = 1; i <= 8; i++) {
    console.log(`   PayoutTables7_Part${i}: ${existingAddresses[`payoutTables7_Part${i}`]}`);
  }

  console.log(`\nNext steps:`);
  console.log(`1. Deploy CasinoSlot: npx hardhat run scripts/deployment/02-deploy-casino-slot.js --network ${network.name}`);
  console.log("------------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 