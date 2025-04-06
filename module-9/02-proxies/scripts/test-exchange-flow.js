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
    console.log("=== TESTING EXCHANGE SYSTEM DEPLOYMENT FLOW ===");
    
    // Step 1: Deploy the Exchange system
    console.log("\n=== Step 1: Deploying Exchange System ===");
    await runCommand('npx', ['hardhat', 'run', 'scripts/02-exchange/deploy.js', '--network', 'localhost']);
    
    // Step 2: Read the address file to verify it was created properly
    console.log("\n=== Step 2: Verifying address tracking ===");
    const addressFile = path.join(__dirname, '../.addresses.json');
    if (fs.existsSync(addressFile)) {
      const addresses = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
      console.log("Address file updated successfully:");
      
      // Check if exchange addresses are present
      if (addresses.localhost && addresses.localhost['02-exchange']) {
        const exchangeAddresses = addresses.localhost['02-exchange'];
        console.log("Exchange addresses:");
        console.log(JSON.stringify(exchangeAddresses, null, 2));
        
        // Verify key contracts were deployed
        const requiredKeys = ['token', 'nft', 'exchange'];
        const missingKeys = requiredKeys.filter(key => !exchangeAddresses[key]);
        
        if (missingKeys.length === 0) {
          console.log("✅ All required contracts deployed successfully");
        } else {
          console.log(`❌ Missing contracts: ${missingKeys.join(', ')}`);
        }
        
        // Verify admin address is set correctly
        if (exchangeAddresses.admin === '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266') {
          console.log("✅ Admin address set correctly");
        } else {
          console.log("❌ Admin address not set correctly");
        }
      } else {
        console.log("❌ Exchange addresses not found in tracking file");
      }
    } else {
      console.log("❌ Address file not created");
    }
    
    console.log("\n=== EXCHANGE TEST FLOW COMPLETED ===");
  } catch (error) {
    console.error("Error running test flow:", error);
    process.exit(1);
  }
}

main(); 