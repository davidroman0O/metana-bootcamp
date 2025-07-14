const { ethers, upgrades } = require("hardhat");
const { getAddresses } = require("./utils/addresses");

async function reinitializeProxy() {
    console.log("🔄 Reinitializing CasinoSlot proxy...\n");
    
    const [deployer] = await ethers.getSigners();
    const addresses = getAddresses("localhost");
    
    if (!addresses || !addresses.casino || !addresses.casino.proxy) {
        console.error("❌ No casino proxy address found!");
        return;
    }
    
    const proxyAddress = addresses.casino.proxy;
    console.log(`📍 Proxy address: ${proxyAddress}`);
    
    // Check if proxy has code
    const code = await ethers.provider.getCode(proxyAddress);
    console.log(`📦 Proxy has code: ${code !== "0x"}`);
    
    if (code === "0x") {
        console.log("❌ Proxy contract doesn't exist on chain!");
        console.log("💡 You need to clear the address file and redeploy");
        console.log("   Run: rm .addresses.localhost.json && npm run deploy:local");
        return;
    }
    
    // Check implementation slot
    const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const implAddress = await ethers.provider.getStorageAt(proxyAddress, implSlot);
    console.log(`🔍 Implementation slot: ${implAddress}`);
    
    if (implAddress === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log("🔧 Proxy needs initialization...");
        
        // Deploy new implementation
        const CasinoSlotTest = await ethers.getContractFactory("CasinoSlotTest");
        const impl = await CasinoSlotTest.deploy();
        await impl.deployed();
        console.log(`✅ New implementation deployed: ${impl.address}`);
        
        // Initialize through proxy
        const proxy = await ethers.getContractAt("CasinoSlotTest", proxyAddress);
        
        const ethUsdPriceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
        const payoutTablesAPI = addresses.payouts.payoutTablesAPI;
        const vrfCoordinator = addresses.mock.vrfCoordinator;
        
        console.log("\n🔧 Initializing with:");
        console.log(`   ETH/USD Feed: ${ethUsdPriceFeed}`);
        console.log(`   Payout Tables: ${payoutTablesAPI}`);
        console.log(`   VRF Coordinator: ${vrfCoordinator}`);
        console.log(`   Owner: ${deployer.address}`);
        
        try {
            const tx = await proxy.initialize(
                ethUsdPriceFeed,
                payoutTablesAPI,
                vrfCoordinator,
                deployer.address
            );
            await tx.wait();
            console.log("\n✅ Proxy initialized successfully!");
            
            // Verify
            const owner = await proxy.owner();
            const name = await proxy.name();
            console.log(`   Owner: ${owner}`);
            console.log(`   Token Name: ${name}`);
            
        } catch (error) {
            console.error("❌ Initialization failed:", error.message);
        }
    } else {
        console.log("✅ Proxy is already initialized");
        
        try {
            const proxy = await ethers.getContractAt("CasinoSlotTest", proxyAddress);
            const owner = await proxy.owner();
            const name = await proxy.name();
            console.log(`   Owner: ${owner}`);
            console.log(`   Token Name: ${name}`);
        } catch (error) {
            console.log("❌ But can't call functions:", error.message);
        }
    }
}

reinitializeProxy()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });