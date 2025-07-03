const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n💰 Sending ETH to SpinTester contract");
    console.log("==================================");
    
    // Load tester deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ SpinTester deployment not found at ${deploymentPath}`);
        console.error("Please run spin-test-deploy.js first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const TESTER_ADDRESS = deployment.spinTester.address;
    
    console.log(`🧪 SpinTester address: ${TESTER_ADDRESS}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${signer.address}`);
    
    // Get balances
    const signerBalance = await ethers.provider.getBalance(signer.address);
    const testerBalance = await ethers.provider.getBalance(TESTER_ADDRESS);
    
    console.log(`\n📊 Current balances:`);
    console.log(`Your ETH balance: ${ethers.utils.formatEther(signerBalance)} ETH`);
    console.log(`SpinTester ETH balance: ${ethers.utils.formatEther(testerBalance)} ETH`);
    
    // Define amount to send - 0.05 ETH should be enough for multiple tests
    const amountToSend = ethers.utils.parseEther("0.05");
    console.log(`\n💸 Amount to send: ${ethers.utils.formatEther(amountToSend)} ETH`);
    
    if (signerBalance.lt(amountToSend.add(ethers.utils.parseEther("0.01")))) { // Add some for gas
        console.log(`❌ Insufficient ETH balance.`);
        return;
    }
    
    // Send ETH
    console.log(`\n🚀 Sending ETH to SpinTester contract...`);
    const tx = await signer.sendTransaction({
        to: TESTER_ADDRESS,
        value: amountToSend,
        gasPrice: ethers.utils.parseUnits("20", "gwei")
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check new balance
    const newTesterBalance = await ethers.provider.getBalance(TESTER_ADDRESS);
    
    console.log(`\n📊 New balances:`);
    console.log(`SpinTester ETH balance: ${ethers.utils.formatEther(newTesterBalance)} ETH`);
    console.log(`SpinTester ETH increase: ${ethers.utils.formatEther(newTesterBalance.sub(testerBalance))} ETH`);
    
    console.log(`\n✅ Successfully funded SpinTester with ETH!`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 