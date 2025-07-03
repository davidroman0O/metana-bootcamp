const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔗 Sending LINK tokens to Upgradable SpinTester contract");
    console.log("===========================================");
    
    // Load tester deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ Upgradable SpinTester deployment not found at ${deploymentPath}`);
        console.error("Please run upgradable-spin-test-deploy.js first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const TESTER_ADDRESS = deployment.proxy;
    
    // Get LINK token address from constructor args
    const LINK_TOKEN = deployment.constructorArgs[2]; // Third argument is LINK token
    
    console.log(`🧪 Upgradable SpinTester address: ${TESTER_ADDRESS}`);
    console.log(`🔗 LINK token address: ${LINK_TOKEN}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${signer.address}`);
    
    // Get LINK contract
    const linkToken = await ethers.getContractAt([
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
    ], LINK_TOKEN);
    
    // Get current balances
    const linkDecimals = await linkToken.decimals();
    const linkSymbol = await linkToken.symbol();
    const signerBalance = await linkToken.balanceOf(signer.address);
    const testerBalance = await linkToken.balanceOf(TESTER_ADDRESS);
    
    console.log(`\n📊 Current balances:`);
    console.log(`Your ${linkSymbol} balance: ${ethers.utils.formatUnits(signerBalance, linkDecimals)}`);
    console.log(`Upgradable SpinTester ${linkSymbol} balance: ${ethers.utils.formatUnits(testerBalance, linkDecimals)}`);
    
    // Define amount to send - 1 LINK should be enough for testing
    const amountToSend = ethers.utils.parseUnits("1", linkDecimals);
    console.log(`\n💸 Amount to send: ${ethers.utils.formatUnits(amountToSend, linkDecimals)} ${linkSymbol}`);
    
    if (signerBalance.lt(amountToSend)) {
        console.log(`❌ Insufficient ${linkSymbol} balance.`);
        console.log(`💡 Get ${linkSymbol} from: https://faucets.chain.link/sepolia`);
        return;
    }
    
    // Send LINK
    console.log(`\n🚀 Sending ${linkSymbol} to Upgradable SpinTester contract...`);
    const tx = await linkToken.transfer(TESTER_ADDRESS, amountToSend, {
        gasLimit: 100000,
        gasPrice: ethers.utils.parseUnits("20", "gwei")
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check new balances
    const newTesterBalance = await linkToken.balanceOf(TESTER_ADDRESS);
    
    console.log(`\n📊 New balances:`);
    console.log(`Upgradable SpinTester ${linkSymbol} balance: ${ethers.utils.formatUnits(newTesterBalance, linkDecimals)}`);
    console.log(`Upgradable SpinTester ${linkSymbol} increase: ${ethers.utils.formatUnits(newTesterBalance.sub(testerBalance), linkDecimals)}`);
    
    console.log(`\n✅ Successfully funded Upgradable SpinTester with ${linkSymbol}!`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 