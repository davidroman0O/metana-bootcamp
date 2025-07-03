const { run, network } = require("hardhat");
const { getAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
require('dotenv').config();

async function verify(address, constructorArguments = [], contract) {
  if (network.name === 'localhost' || network.name === 'hardhat') {
    console.log("Skipping verification on local network.");
    return true;
  }
  
  console.log(`\n  > Verifying contract at ${address}...`);
  console.log(`    Etherscan: https://${network.name}.etherscan.io/address/${address}#code`);
  
  try {
    // Try to verify
    await run("verify:verify", {
      address,
      constructorArguments,
      ...(contract && { contract }),
    });
    
    console.log(`   ✅ Verification successful!`);
    return true;
    
  } catch (error) {
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes("already verified")) {
      console.log(`   ✅ Already verified`);
      return true;
    } else if (errorMsg.includes("does not have bytecode")) {
      console.error(`   ❌ FAILED: Contract not found at address ${address}`);
      console.error(`      This contract was not deployed or address is wrong`);
      return false;
    } else if (errorMsg.includes("fail to verify")) {
      console.error(`   ❌ FAILED: Verification rejected by Etherscan`);
      console.error(`      Reason: ${error.message}`);
      return false;
    } else if (errorMsg.includes("rate limit") || errorMsg.includes("too many requests")) {
      console.error(`   ❌ FAILED: Etherscan API rate limit reached`);
      console.error(`      Wait a few minutes and try again`);
      return false;
    } else if (errorMsg.includes("invalid api key") || errorMsg.includes("forbidden")) {
      console.error(`   ❌ FAILED: Invalid Etherscan API key`);
      console.error(`      Check your ETHERSCAN_API_KEY in .env file`);
      return false;
    } else if (errorMsg.includes("network error") || errorMsg.includes("econnrefused")) {
      console.error(`   ❌ FAILED: Network connection error`);
      console.error(`      Check your internet connection`);
      return false;
    } else {
      console.error(`   ❌ FAILED: Unknown error`);
      console.error(`      Full error: ${error.message}`);
      console.error(`      Raw error:`, error);
      return false;
    }
  }
}

async function main() {
  console.log(`\n▶️  Verifying contracts on '${network.name}'`);
  console.log("------------------------------------------------------");

  // Compile contracts first to ensure latest bytecode
  console.log("\n📦 Compiling contracts...");
  await run("compile");
  console.log("   ✅ Compilation complete");

  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("\n❌ ETHERSCAN_API_KEY not found in .env file. Skipping verification.");
    console.error("💡 Get your API key from: https://etherscan.io/apis");
    return;
  }

  const payoutAddresses = getAddresses(network.name, "payouts");
  const casinoAddresses = getAddresses(network.name, "casino");
  
  let verified = 0;
  let failed = 0;

  if (payoutAddresses) {
    console.log("\nVerifying PayoutTables contracts...");
    
    const results = await Promise.all([
      verify(payoutAddresses.payoutTables3),
      verify(payoutAddresses.payoutTables4), 
      verify(payoutAddresses.payoutTables5),
      verify(payoutAddresses.payoutTables6),
    ]);
    
    verified += results.filter(Boolean).length;
    failed += results.filter(r => !r).length;
    
    // Verify 7-reel chunks
    console.log("\nVerifying PayoutTables7 chunks...");
    const chunkResults = [];
    for (let i = 1; i <= 8; i++) {
      const result = await verify(payoutAddresses[`payoutTables7_Part${i}`]);
      chunkResults.push(result);
    }
    verified += chunkResults.filter(Boolean).length;
    failed += chunkResults.filter(r => !r).length;

    // PayoutTables7 Router
    console.log("\nVerifying PayoutTables7 Router...");
    const pt7Chunks = Array.from({length: 8}, (_, i) => payoutAddresses[`payoutTables7_Part${i+1}`]);
    const routerResult = await verify(payoutAddresses.payoutTables7Router, pt7Chunks);
    if (routerResult) verified++; else failed++;

    // PayoutTables API
    console.log("\nVerifying PayoutTables API...");
    const apiResult = await verify(payoutAddresses.payoutTablesAPI, [
      payoutAddresses.payoutTables3,
      payoutAddresses.payoutTables4,
      payoutAddresses.payoutTables5,
      payoutAddresses.payoutTables6,
      payoutAddresses.payoutTables7Router
    ]);
    if (apiResult) verified++; else failed++;
  }

  if (casinoAddresses) {
    console.log("\nVerifying CasinoSlot implementation...");
    const casinoResult = await verify(casinoAddresses.implementation);
    if (casinoResult) verified++; else failed++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`VERIFICATION SUMMARY:`);
  console.log(`✅ Successfully verified: ${verified} contracts`);
  console.log(`❌ Failed to verify: ${failed} contracts`);
  
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} contracts failed verification. Check the errors above.`);
    console.log(`💡 Common issues:`);
    console.log(`   • Wrong constructor arguments`);
    console.log(`   • Contract not deployed yet`);
    console.log(`   • Etherscan API rate limiting`);
    console.log(`   • Network connectivity issues`);
  }
  
  console.log(`\nNext step: Verify proxy contract`);
  console.log(`npx hardhat run scripts/deployment/05-verify-proxy.js --network ${network.name}`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 