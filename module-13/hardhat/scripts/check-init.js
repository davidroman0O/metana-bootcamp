const { ethers } = require("hardhat");

async function checkInitialization() {
    console.log("🔍 Checking CasinoSlot initialization...\n");
    
    const deploymentData = require("../deployments/deployment-31337.json");
    const casinoSlotAddress = deploymentData.contracts.CasinoSlotTest.proxy;
    
    console.log(`📍 Casino Contract: ${casinoSlotAddress}`);
    
    // Get contract instance
    const CasinoSlot = await ethers.getContractFactory("CasinoSlotTest");
    const casinoSlot = CasinoSlot.attach(casinoSlotAddress);
    
    try {
        // Check if initialized by trying to call a basic function
        const owner = await casinoSlot.owner();
        console.log(`✅ Owner: ${owner}`);
        
        const name = await casinoSlot.name();
        console.log(`✅ Token Name: ${name}`);
        
        const symbol = await casinoSlot.symbol();
        console.log(`✅ Token Symbol: ${symbol}`);
        
        const totalSupply = await casinoSlot.totalSupply();
        console.log(`✅ Total Supply: ${ethers.utils.formatEther(totalSupply)}`);
        
        const houseEdge = await casinoSlot.houseEdge();
        console.log(`✅ House Edge: ${houseEdge} basis points`);
        
        console.log("\n✅ Contract is properly initialized!");
        
    } catch (error) {
        console.log("\n❌ Contract appears to be uninitialized!");
        console.log(`Error: ${error.message}`);
        
        // Try to get implementation address
        try {
            const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
            const implAddress = await ethers.provider.getStorageAt(casinoSlotAddress, implSlot);
            console.log(`\n🔍 Implementation slot: ${implAddress}`);
            
            if (implAddress === "0x0000000000000000000000000000000000000000000000000000000000000000") {
                console.log("❌ No implementation set - proxy not initialized!");
            } else {
                console.log(`✅ Implementation address: 0x${implAddress.slice(26)}`);
            }
        } catch (e) {
            console.log("Could not check implementation slot");
        }
    }
}

checkInitialization()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });