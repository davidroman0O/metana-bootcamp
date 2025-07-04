const { ethers } = require("hardhat");

async function main() {
    console.log("\n🎰 Testing CasinoSlot Contract on Sepolia");
    console.log("=========================================");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using account: ${signer.address}`);
    console.log(`💰 Account balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH`);
    
    // Load the current deployment
    const deployment = require('../deployments/deployment-11155111.json');
    const CASINO_ADDRESS = deployment.contracts.CasinoSlot.address;
    console.log(`🎰 Casino contract: ${CASINO_ADDRESS}`);
    
    // Get contract instance
    const casino = await ethers.getContractAt("CasinoSlot", CASINO_ADDRESS);
    
    console.log("\n🔍 Step 1: Basic Contract Checks");
    console.log("================================");
    
    try {
        // Check if contract exists
        const code = await ethers.provider.getCode(CASINO_ADDRESS);
        console.log(`✅ Contract has code: ${code.length > 2}`);
        
        // Check basic contract state
        const totalSupply = await casino.totalSupply();
        console.log(`✅ Total CHIPS supply: ${ethers.utils.formatEther(totalSupply)}`);
        
        const prizePool = await casino.totalPrizePool();
        console.log(`✅ Prize pool: ${ethers.utils.formatEther(prizePool)} ETH`);
        
        const contractBalance = await ethers.provider.getBalance(CASINO_ADDRESS);
        console.log(`✅ Contract ETH balance: ${ethers.utils.formatEther(contractBalance)} ETH`);
        
    } catch (error) {
        console.log(`❌ Basic checks failed: ${error.message}`);
        return;
    }
    
    console.log("\n🔍 Step 2: Test calculateChipsFromETH");
    console.log("====================================");
    
    try {
        const testAmount = ethers.utils.parseEther("0.01"); // 0.01 ETH
        console.log(`📊 Testing with ${ethers.utils.formatEther(testAmount)} ETH`);
        
        const chipsAmount = await casino.calculateChipsFromETH(testAmount);
        console.log(`✅ Expected CHIPS: ${ethers.utils.formatEther(chipsAmount)}`);
        console.log(`✅ Calculation works: ${chipsAmount.gt(0)}`);
        
    } catch (error) {
        console.log(`❌ calculateChipsFromETH failed: ${error.message}`);
        console.log(`💡 This is likely where buyChips is failing!`);
        return;
    }
    
    console.log("\n🔍 Step 3: Test buyChips with Very Small Amount");
    console.log("===============================================");
    
    try {
        const smallAmount = ethers.utils.parseEther("0.001"); // 0.001 ETH
        console.log(`💰 Attempting to buy chips with ${ethers.utils.formatEther(smallAmount)} ETH`);
        
        // Get current CHIPS balance
        const chipsBefore = await casino.balanceOf(signer.address);
        console.log(`🪙 CHIPS before: ${ethers.utils.formatEther(chipsBefore)}`);
        
        // Estimate gas first
        console.log("⛽ Estimating gas...");
        const gasEstimate = await casino.estimateGas.buyChips({ value: smallAmount });
        console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);
        
        // Try the transaction
        console.log("🚀 Sending buyChips transaction...");
        const tx = await casino.buyChips({ 
            value: smallAmount,
            gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
        });
        
        console.log(`📝 Transaction hash: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        // Check new CHIPS balance
        const chipsAfter = await casino.balanceOf(signer.address);
        const chipsReceived = chipsAfter.sub(chipsBefore);
        console.log(`🪙 CHIPS received: ${ethers.utils.formatEther(chipsReceived)}`);
        
        console.log("✅ buyChips works! Issue must be in frontend/wallet.");
        
    } catch (error) {
        console.log(`❌ buyChips failed: ${error.message}`);
        
        // Try to get more specific error info
        if (error.message.includes("reverted")) {
            console.log("💡 Transaction reverted - contract rejected it");
            console.log("🔍 Possible reasons:");
            console.log("   - Amount too small (results in 0 CHIPS)");
            console.log("   - Price feed validation failed");
            console.log("   - Contract is paused");
            console.log("   - Arithmetic overflow/underflow");
        } else if (error.message.includes("gas")) {
            console.log("💡 Gas-related error");
            console.log("🔍 Possible reasons:");
            console.log("   - Gas limit too low");
            console.log("   - Out of gas during execution");
        } else if (error.message.includes("timeout")) {
            console.log("💡 Transaction timeout");
            console.log("🔍 Possible reasons:");
            console.log("   - Network congestion");
            console.log("   - Gas price too low");
        }
    }
    
    console.log("\n🔍 Step 4: Contract Configuration Check");
    console.log("======================================");
    
    try {
        const owner = await casino.owner();
        console.log(`👑 Owner: ${owner}`);
        
        const paused = await casino.paused();
        console.log(`⏸️  Paused: ${paused}`);
        
        // Check price feed addresses
        const ethFeed = await casino.ethUsdPriceFeed();
        const linkFeed = await casino.linkUsdPriceFeed();
        console.log(`📊 ETH/USD Feed: ${ethFeed}`);
        console.log(`📊 LINK/USD Feed: ${linkFeed}`);
        
    } catch (error) {
        console.log(`❌ Configuration check failed: ${error.message}`);
    }
    
    console.log("\n📋 Diagnosis Complete");
    console.log("====================");
}

main().catch(console.error); 