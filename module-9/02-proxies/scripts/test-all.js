const { spawn } = require('child_process');

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
    console.log("\n\n======== RUNNING ALL TEST FLOWS ========\n\n");
    
    // Run NFT test flow
    console.log("\n\n======== NFT TEST FLOW ========\n\n");
    await runCommand('node', ['scripts/test-nft-flow.js']);
    
    // Run Exchange test flow
    console.log("\n\n======== EXCHANGE TEST FLOW ========\n\n");
    await runCommand('node', ['scripts/test-exchange-flow.js']);
    
    // Run Staking test flow
    console.log("\n\n======== STAKING TEST FLOW ========\n\n");
    await runCommand('node', ['scripts/test-staking-flow.js']);
    
    console.log("\n\n======== ALL TESTS COMPLETED SUCCESSFULLY ========\n\n");
  } catch (error) {
    console.error("Error running test flows:", error);
    process.exit(1);
  }
}

main(); 