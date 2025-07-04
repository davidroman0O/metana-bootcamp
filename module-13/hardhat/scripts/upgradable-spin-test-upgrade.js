const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🔄 Upgrading UpgradableSpinTester Contract");
    console.log("=======================================");
    
    // Load deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ Deployment file not found: ${deploymentPath}`);
        console.error("Please run the deployment script first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const proxyAddress = deployment.spinTester.proxy;
    
    console.log(`🧪 Proxy address: ${proxyAddress}`);
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    // Deploy the upgraded implementation
    console.log("\n📄 Deploying new implementation...");
    const UpgradableSpinTester = await ethers.getContractFactory("UpgradableSpinTester");
    
    console.log("\n🔄 Upgrading proxy...");
    const upgraded = await upgrades.upgradeProxy(proxyAddress, UpgradableSpinTester);
    
    console.log(`✅ Upgrade transaction hash: ${upgraded.deployTransaction.hash}`);
    console.log("Waiting for confirmation...");
    
    await upgraded.deployed();
    
    // Get the implementation address
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`\n🧪 New implementation address: ${implementationAddress}`);
    
    // Update the deployment file
    deployment.spinTester.implementation = implementationAddress;
    deployment.spinTester.lastUpgrade = new Date().toISOString();
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log(`\n✅ Deployment file updated: ${deploymentPath}`);
    
    console.log("\n✅ Contract upgraded successfully!");
    console.log("\n🔑 Now run the approve script to approve LINK tokens for the VRF wrapper:");
    console.log("npx hardhat run scripts/upgradable-spin-test-approve-link.js --network " + network.name);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 