const { ethers } = require("hardhat");
const deployment = require('../deployments/deployment-11155111.json');

async function main() {
    console.log("\n🔗 Sending LINK tokens to Casino contract");
    console.log("=======================================");
    
    const CASINO_ADDRESS = deployment.contracts.CasinoSlot.address;
    const LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Sepolia LINK
    
    console.log(`🎰 Casino address: ${CASINO_ADDRESS}`);
    console.log(`🔗 LINK token address: ${LINK_TOKEN}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${signer.address}`);
    
    // Get LINK contract instance
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
    const casinoBalance = await linkToken.balanceOf(CASINO_ADDRESS);
    
    console.log(`\n📊 Current balances:`);
    console.log(`Your ${linkSymbol} balance: ${ethers.utils.formatUnits(signerBalance, linkDecimals)}`);
    console.log(`Casino ${linkSymbol} balance: ${ethers.utils.formatUnits(casinoBalance, linkDecimals)}`);
    
    // Define amount to send - 5 LINK
    const amountToSend = ethers.utils.parseUnits("5", linkDecimals);
    console.log(`\n💸 Amount to send: ${ethers.utils.formatUnits(amountToSend, linkDecimals)} ${linkSymbol}`);
    
    if (signerBalance.lt(amountToSend)) {
        console.log(`❌ Insufficient ${linkSymbol} balance.`);
        console.log(`💡 Get ${linkSymbol} from: https://faucets.chain.link/sepolia`);
        return;
    }
    
    // Send LINK
    console.log(`\n🚀 Sending ${linkSymbol} to Casino contract...`);
    const tx = await linkToken.transfer(CASINO_ADDRESS, amountToSend, {
        gasLimit: 100000,
        gasPrice: ethers.utils.parseUnits("20", "gwei")
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check new balances
    const newSignerBalance = await linkToken.balanceOf(signer.address);
    const newCasinoBalance = await linkToken.balanceOf(CASINO_ADDRESS);
    
    console.log(`\n📊 New balances:`);
    console.log(`Your ${linkSymbol} balance: ${ethers.utils.formatUnits(newSignerBalance, linkDecimals)}`);
    console.log(`Casino ${linkSymbol} balance: ${ethers.utils.formatUnits(newCasinoBalance, linkDecimals)}`);
    console.log(`Casino ${linkSymbol} increase: ${ethers.utils.formatUnits(newCasinoBalance.sub(casinoBalance), linkDecimals)}`);
    
    console.log(`\n✅ Successfully sent ${linkSymbol} to Casino contract!`);
    console.log(`Now the contract can make VRF requests even if swaps fail.`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 