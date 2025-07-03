const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Finding Exact Revert Point");
    console.log("=============================");
    
    const deployment = require('../deployments/deployment-11155111.json');
    const [signer] = await ethers.getSigners();
    const casino = await ethers.getContractAt("CasinoSlot", deployment.contracts.CasinoSlot.address);
    
    // Test each part of _executeSpin individually
    const cost = ethers.utils.parseEther("1.7");
    
    console.log("1. Testing calculateETHFromCHIPS...");
    try {
        const ethValue = await casino.calculateETHFromCHIPS(cost);
        console.log("✅ ETH value:", ethers.utils.formatEther(ethValue));
    } catch (e) {
        console.log("❌ FAIL calculateETHFromCHIPS:", e.message);
        return;
    }
    
    console.log("2. Testing _getLINKCostInUSD...");
    try {
        // This is an internal function, let's test the external version if available
        const vrfCost = await casino.callStatic.getSpinCost(3);
        console.log("✅ VRF cost calculation works");
    } catch (e) {
        console.log("❌ FAIL VRF cost:", e.message);
        return;
    }
    
    console.log("3. Testing actual spin call with manual gas...");
    try {
        const tx = await casino.spin3Reels({ 
            gasLimit: 5000000,
            gasPrice: ethers.utils.parseUnits("20", "gwei")
        });
        console.log("✅ Spin succeeded! Tx:", tx.hash);
        await tx.wait();
        console.log("✅ Transaction mined!");
    } catch (e) {
        console.log("❌ FAIL spin execution:", e.message);
        
        // Try to decode the revert reason
        if (e.data) {
            try {
                const decoded = casino.interface.parseError(e.data);
                console.log("🔍 Decoded error:", decoded.name, decoded.args);
            } catch (decodeError) {
                console.log("🔍 Raw error data:", e.data);
            }
        }
    }
}

main().catch(console.error); 