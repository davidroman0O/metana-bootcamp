const { network } = require("hardhat");
const { initAddressFile } = require("../utils/addresses");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`\n▶️  Initializing fresh deployment state for '${network.name}' network`);
  console.log("------------------------------------------------------");
  
  const addressesFilePath = path.join(__dirname, `../../.addresses.${network.name}.json`);
  
  if (fs.existsSync(addressesFilePath)) {
    console.log(`\n📄 Found existing deployment file: .addresses.${network.name}.json`);
    
    const backupDir = path.join(__dirname, '../../deployments/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const backupPath = path.join(backupDir, `.addresses.${network.name}.backup.${timestamp}.json`);
    
    fs.copyFileSync(addressesFilePath, backupPath);
    console.log(`🗄️  Backed up existing file to: ${path.relative(path.join(__dirname, '../..'), backupPath)}`);
  }
  
  initAddressFile(network.name);
  
  console.log(`\n✅ Initialization complete. Ready for fresh deployments on '${network.name}'.`);
  console.log("\nNext steps:");
  console.log(`1. Deploy Payout Tables: npx hardhat run scripts/deployment/01-deploy-payout-tables.js --network ${network.name}`);
  console.log("------------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 