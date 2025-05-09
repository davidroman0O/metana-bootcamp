const { network } = require("hardhat");
const { initAddressFile } = require("../utils/addresses");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`Initializing fresh deployment state for ${network.name} network`);
  console.log("Chain ID:", network.config.chainId);
  
  // Path to the network specific addresses file
  const addressesFilePath = path.join(__dirname, `../../.addresses.${network.name}.json`);
  
  // Check if file exists
  if (fs.existsSync(addressesFilePath)) {
    console.log(`Found existing deployment file at ${addressesFilePath}`);
    console.log("Backing up existing file before creating a new one...");
    
    // Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const backupPath = `${addressesFilePath}.backup.${timestamp}`;
    fs.copyFileSync(addressesFilePath, backupPath);
    console.log(`Backup created at: ${backupPath}`);
  }
  
  // Initialize fresh addresses file
  initAddressFile(network.name);
  
  console.log(`✅ Initialization complete. Ready for fresh deployments on ${network.name}.`);
  console.log("\nNext steps:");
  console.log("1. Deploy NFT V1: npx hardhat run scripts/deployment/01-deploy-nft-v1.js --network", network.name);
  console.log("2. After deployment, you can proceed with the upgrade and other steps");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 