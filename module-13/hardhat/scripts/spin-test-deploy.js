const { ethers, network } = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🧪 Deploying SpinTester Contract");
    console.log("===============================");
    
    // Load existing deployment information
    const deployment = require('../deployments/deployment-11155111.json');
    
    // Extract parameters from existing deployment
    const {
        vrfWrapper,
        ethUsdPriceFeed,
        linkUsdPriceFeed,
        linkToken,
        uniswapRouter
    } = deployment.contracts.CasinoSlot.constructor;
    
    console.log("\n📝 Using parameters from existing deployment:");
    console.log(`VRF Wrapper: ${vrfWrapper}`);
    console.log(`ETH/USD Feed: ${ethUsdPriceFeed}`);
    console.log(`LINK/USD Feed: ${linkUsdPriceFeed}`);
    console.log(`LINK Token: ${linkToken}`);
    console.log(`Uniswap Router: ${uniswapRouter}`);
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`\n🔑 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
    
    // Deploy SpinTester contract
    console.log("\n📦 Deploying SpinTester contract...");
    const SpinTester = await ethers.getContractFactory("SpinTester");
    const tester = await SpinTester.deploy(
        ethUsdPriceFeed,
        linkUsdPriceFeed,
        linkToken,
        vrfWrapper,
        uniswapRouter
    );
    
    await tester.deployed();
    console.log(`✅ SpinTester deployed to: ${tester.address}`);
    
    // Save deployment information
    const deploymentInfo = {
        network: {
            name: network.name,
            chainId: network.config.chainId
        },
        spinTester: {
            address: tester.address,
            deployer: deployer.address,
            deployedAt: new Date().toISOString()
        },
        parameters: {
            ethUsdPriceFeed,
            linkUsdPriceFeed,
            linkToken,
            vrfWrapper,
            uniswapRouter
        },
        mainCasinoAddress: deployment.contracts.CasinoSlot.address
    };
    
    // Create directory if it doesn't exist
    const deploymentDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir);
    }
    
    // Save to file
    const deploymentPath = path.join(deploymentDir, `spin-tester-${network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${path.relative(__dirname, deploymentPath)}`);
    
    console.log("\n🧪 Next Steps:");
    console.log(`1. Send ETH to the tester contract: ${tester.address}`);
    console.log(`2. Send LINK to the tester contract`);
    console.log(`3. Run individual test functions`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
