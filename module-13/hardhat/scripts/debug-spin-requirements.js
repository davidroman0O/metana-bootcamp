const { ethers } = require("hardhat");

async function main() {
    console.log("\n🎰 Debugging Spin Requirements on Sepolia");
    console.log("==========================================");
    
    const [signer] = await ethers.getSigners();
    // Load the current deployment
    const deployment = require('../deployments/deployment-11155111.json');
    const CASINO_ADDRESS = deployment.contracts.CasinoSlot.address;
    
    console.log(`🔑 Account: ${signer.address}`);
    console.log(`🎰 Casino: ${CASINO_ADDRESS}`);
    
    const casino = await ethers.getContractAt("CasinoSlot", CASINO_ADDRESS);
    
    console.log("\n📋 Step 1: Check User CHIPS Balance & Allowance");
    console.log("===============================================");
    
    try {
        const chipBalance = await casino.balanceOf(signer.address);
        const allowance = await casino.allowance(signer.address, CASINO_ADDRESS);
        const spinCost = await casino.getSpinCost(3); // 3-reel cost
        
        console.log(`🪙 CHIPS Balance: ${ethers.utils.formatEther(chipBalance)}`);
        console.log(`🎫 CHIPS Allowance: ${ethers.utils.formatEther(allowance)}`);
        console.log(`💰 3-Reel Spin Cost: ${ethers.utils.formatEther(spinCost)}`);
        
        const hasEnoughChips = chipBalance.gte(spinCost);
        const hasEnoughAllowance = allowance.gte(spinCost);
        
        console.log(`✅ Has enough CHIPS: ${hasEnoughChips}`);
        console.log(`✅ Has enough allowance: ${hasEnoughAllowance}`);
        
        if (!hasEnoughChips) {
            console.log(`❌ PROBLEM: Need to buy more CHIPS!`);
            console.log(`   Current: ${ethers.utils.formatEther(chipBalance)}`);
            console.log(`   Needed: ${ethers.utils.formatEther(spinCost)}`);
            return;
        }
        
        if (!hasEnoughAllowance) {
            console.log(`❌ PROBLEM: Need to approve CHIPS spending!`);
            console.log(`   Current allowance: ${ethers.utils.formatEther(allowance)}`);
            console.log(`   Needed allowance: ${ethers.utils.formatEther(spinCost)}`);
            console.log(`   💡 Call casino.approve() first!`);
            return;
        }
        
    } catch (error) {
        console.log(`❌ Error checking balances: ${error.message}`);
        return;
    }
    
    console.log("\n📋 Step 2: Check Contract ETH Balance");
    console.log("====================================");
    
    try {
        const contractETH = await ethers.provider.getBalance(CASINO_ADDRESS);
        console.log(`💰 Contract ETH: ${ethers.utils.formatEther(contractETH)}`);
        
        if (contractETH.eq(0)) {
            console.log(`❌ PROBLEM: Contract has no ETH for swaps!`);
            console.log(`   💡 Contract needs ETH to buy LINK for VRF`);
            console.log(`   💡 Send some ETH to contract or use buyChips to add ETH`);
            return;
        }
        
    } catch (error) {
        console.log(`❌ Error checking contract ETH: ${error.message}`);
        return;
    }
    
    console.log("\n📋 Step 3: Check VRF Wrapper");
    console.log("============================");
    
    try {
        // Check if contract is paused
        const paused = await casino.paused();
        console.log(`⏸️  Contract paused: ${paused}`);
        
        if (paused) {
            console.log(`❌ PROBLEM: Contract is paused!`);
            return;
        }
        
        // Try to read VRF wrapper (this might fail if not properly initialized)
        try {
            const vrfWrapper = await casino.vrfWrapper();
            console.log(`🎲 VRF Wrapper: ${vrfWrapper}`);
            
            // Check if VRF wrapper address is valid
            if (vrfWrapper === "0x0000000000000000000000000000000000000000") {
                console.log(`❌ PROBLEM: VRF Wrapper not set!`);
                return;
            }
            
        } catch (vrfError) {
            console.log(`❌ PROBLEM: Cannot read VRF wrapper: ${vrfError.message}`);
            return;
        }
        
    } catch (error) {
        console.log(`❌ Error checking VRF: ${error.message}`);
        return;
    }
    
    console.log("\n📋 Step 4: Test Gas Estimation");
    console.log("==============================");
    
    try {
        console.log("⛽ Estimating gas for spin3Reels...");
        const gasEstimate = await casino.estimateGas.spin3Reels();
        console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);
        
        const gasPrice = await ethers.provider.getGasPrice();
        console.log(`💸 Current gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);
        
        const txCost = gasEstimate.mul(gasPrice);
        const userETH = await ethers.provider.getBalance(signer.address);
        console.log(`💰 TX cost: ${ethers.utils.formatEther(txCost)} ETH`);
        console.log(`💰 User ETH: ${ethers.utils.formatEther(userETH)} ETH`);
        console.log(`✅ Can afford gas: ${userETH.gte(txCost)}`);
        
    } catch (gasError) {
        console.log(`❌ GAS ESTIMATION FAILED: ${gasError.message}`);
        console.log(`💡 This tells us exactly what will fail in the transaction!`);
        
        // Parse the error to find the specific revert reason
        if (gasError.message.includes("revert")) {
            console.log(`\n🔍 REVERT REASON ANALYSIS:`);
            
            if (gasError.message.includes("Insufficient CHIPS")) {
                console.log(`   ❌ Not enough CHIPS balance`);
            } else if (gasError.message.includes("Insufficient allowance")) {
                console.log(`   ❌ CHIPS not approved for spending`);
            } else if (gasError.message.includes("No ETH balance")) {
                console.log(`   ❌ Contract has no ETH for LINK swaps`);
            } else if (gasError.message.includes("VRF")) {
                console.log(`   ❌ VRF wrapper issue`);
            } else if (gasError.message.includes("LINK")) {
                console.log(`   ❌ LINK token or swap issue`);
            } else {
                console.log(`   ❌ Unknown revert: ${gasError.message}`);
            }
        }
        
        return;
    }
    
    console.log("\n✅ ALL CHECKS PASSED!");
    console.log("====================");
    console.log("🎯 Your spin should work. The issue might be:");
    console.log("   1. Frontend transaction timeout (already fixed)");
    console.log("   2. MetaMask gas estimation");
    console.log("   3. Network congestion");
    console.log("\n💡 Try spinning again with manual gas settings in MetaMask");
}

main().catch(console.error); 