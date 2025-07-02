const { run, network } = require("hardhat");
const { getAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
require('dotenv').config();

async function main() {
  console.log(`\n▶️  Verifying proxy contract on '${network.name}'`);
  console.log("------------------------------------------------------");

  if (network.name === 'localhost' || network.name === 'hardhat') {
    console.log("Skipping verification on local network.");
    return;
  }
  
  // Compile contracts first to ensure latest bytecode
  console.log("\n📦 Compiling contracts...");
  await run("compile");
  console.log("   ✅ Compilation complete");
  
  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("\n❌ ETHERSCAN_API_KEY not found in .env file. Skipping verification.");
    console.error("💡 Get your API key from: https://etherscan.io/apis");
    return;
  }
  
  const casinoAddresses = getAddresses(network.name, "casino");
  if (!casinoAddresses || !casinoAddresses.proxy) {
    console.error("❌ CasinoSlot proxy address not found. Cannot verify.");
    return;
  }

  // Display all contract addresses with links
  console.log("\n🎯 CONTRACT ADDRESSES:");
  console.log("------------------------------------------------------");
  
  if (casinoAddresses.proxy) {
    console.log(`🔄 Proxy Contract (Users interact with this):`)
    console.log(`   Address: ${casinoAddresses.proxy}`);
    console.log(`   Etherscan: https://${network.name}.etherscan.io/address/${casinoAddresses.proxy}#code`);
  }
  
  if (casinoAddresses.implementation) {
    console.log(`\n🎯 Current Implementation Contract (Your actual logic):`)
    console.log(`   Address: ${casinoAddresses.implementation}`);
    console.log(`   Etherscan: https://${network.name}.etherscan.io/address/${casinoAddresses.implementation}#code`);
  }
  
  // Check for OpenZeppelin deployment info to show all implementations
  try {
    const fs = require('fs');
    const path = require('path');
    const ozFilePath = path.join(__dirname, '../../.openzeppelin', `${network.name}.json`);
    
    if (fs.existsSync(ozFilePath)) {
      const ozData = JSON.parse(fs.readFileSync(ozFilePath, 'utf8'));
      
      if (ozData.impls && Object.keys(ozData.impls).length > 1) {
        console.log(`\n📜 All Implementation Contracts (Upgrade History):`);
        const implementations = Object.values(ozData.impls);
        implementations.forEach((impl, index) => {
          const status = impl.address === casinoAddresses.implementation ? " (CURRENT)" : " (PREVIOUS)";
          console.log(`   ${index + 1}. ${impl.address}${status}`);
          console.log(`      Etherscan: https://${network.name}.etherscan.io/address/${impl.address}#code`);
        });
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Could not read OpenZeppelin deployment history: ${error.message}`);
  }

  console.log("------------------------------------------------------");
  console.log("  > Verifying CasinoSlot Proxy at:", casinoAddresses.proxy);
  console.log("  > Note: Implementation contract must be verified first.");

  try {
    await withRetry(
      async () => {
        await run("verify:verify", {
          address: casinoAddresses.proxy,
        });
      },
      {
        maxRetries: 3,
        initialDelay: 15000,
        onRetry: (attempt, error) => {
          console.log(`   ⚠️  Verification attempt ${attempt} failed: ${error.message}`);
        }
      }
    );
    console.log(`\n   ✅ Verification process initiated for proxy.`);
    console.log(`   ➡️  Check Etherscan for the result: https://${network.name}.etherscan.io/address/${casinoAddresses.proxy}#code`);

  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log(`   ✅ Proxy already verified`);
    } else {
      console.error(`   ❌ Failed to verify proxy:`, error.message);
    }
  }
  
  // Show ALL deployed contracts with links
  const payoutAddresses = getAddresses(network.name, "payouts");
  if (payoutAddresses) {
    console.log("\n🎲 PAYOUT CONTRACTS:");
    console.log("------------------------------------------------------");
    
    if (payoutAddresses.payoutTablesAPI) {
      console.log(`API Contract: ${payoutAddresses.payoutTablesAPI}`);
      console.log(`https://${network.name}.etherscan.io/address/${payoutAddresses.payoutTablesAPI}#code`);
    }
    
    if (payoutAddresses.payoutTables3) {
      console.log(`\nPayoutTables3: ${payoutAddresses.payoutTables3}`);
      console.log(`https://${network.name}.etherscan.io/address/${payoutAddresses.payoutTables3}#code`);
    }
    
    if (payoutAddresses.payoutTables4) {
      console.log(`\nPayoutTables4: ${payoutAddresses.payoutTables4}`);
      console.log(`https://${network.name}.etherscan.io/address/${payoutAddresses.payoutTables4}#code`);
    }
    
    if (payoutAddresses.payoutTables5) {
      console.log(`\nPayoutTables5: ${payoutAddresses.payoutTables5}`);
      console.log(`https://${network.name}.etherscan.io/address/${payoutAddresses.payoutTables5}#code`);
    }
    
    if (payoutAddresses.payoutTables6) {
      console.log(`\nPayoutTables6: ${payoutAddresses.payoutTables6}`);
      console.log(`https://${network.name}.etherscan.io/address/${payoutAddresses.payoutTables6}#code`);
    }
    
    if (payoutAddresses.payoutTables7Router) {
      console.log(`\nPayoutTables7Router: ${payoutAddresses.payoutTables7Router}`);
      console.log(`https://${network.name}.etherscan.io/address/${payoutAddresses.payoutTables7Router}#code`);
    }
    
    // Show all 7-reel parts
    for (let i = 1; i <= 8; i++) {
      const partKey = `payoutTables7_Part${i}`;
      if (payoutAddresses[partKey]) {
        console.log(`\nPayoutTables7_Part${i}: ${payoutAddresses[partKey]}`);
        console.log(`https://${network.name}.etherscan.io/address/${payoutAddresses[partKey]}#code`);
      }
    }
  }

  console.log("\n✅ Proxy verification complete. All contract links shown above.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 