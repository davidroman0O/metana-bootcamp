const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to run a command and return a promise
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      stdio: 'inherit'
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    console.log("=== TESTING NFT DEPLOYMENT AND UPGRADE FLOW ===");
    
    // Step 1: Deploy the NFT
    console.log("\n=== Step 1: Deploying NFT ===");
    await runCommand('npx', ['hardhat', 'run', 'scripts/01-nft/deploy.js', '--network', 'localhost']);
    
    // Step 2: Read the address file to verify it was created properly
    console.log("\n=== Step 2: Verifying address tracking ===");
    const addressFile = path.join(__dirname, '../.addresses.json');
    if (fs.existsSync(addressFile)) {
      const addresses = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
      console.log("Address file created successfully:");
      console.log(JSON.stringify(addresses, null, 2));
      
      // Verify admin address is set correctly
      if (addresses.localhost && 
          addresses.localhost['01-nft'] && 
          addresses.localhost['01-nft'].admin === '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266') {
        console.log("✅ Admin address set correctly");
      } else {
        console.log("❌ Admin address not set correctly");
      }
    } else {
      console.log("❌ Address file not created");
    }
    
    // Step 3: Upgrade the NFT to V2
    console.log("\n=== Step 3: Upgrading NFT to V2 ===");
    await runCommand('npx', ['hardhat', 'run', 'scripts/01-nft/upgrade.js', '--network', 'localhost']);
    
    // Step 4: Verify the upgrade was tracked properly
    console.log("\n=== Step 4: Verifying upgrade tracking ===");
    if (fs.existsSync(addressFile)) {
      const addresses = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
      if (addresses.localhost && 
          addresses.localhost['01-nft'] && 
          addresses.localhost['01-nft'].implementationV2) {
        console.log("✅ Upgrade tracked successfully");
        console.log(`Implementation V2 address: ${addresses.localhost['01-nft'].implementationV2}`);
      } else {
        console.log("❌ Upgrade not tracked properly");
      }
    }
    
    console.log("\n=== NFT TEST FLOW COMPLETED SUCCESSFULLY ===");
  } catch (error) {
    console.error("Error running test flow:", error);
    process.exit(1);
  }
}

main(); 