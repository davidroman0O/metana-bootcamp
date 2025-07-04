const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔧 Updating VRF Cost Parameters");
    console.log("==============================");
    
    // Load deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ Deployment file not found: ${deploymentPath}`);
        console.error("Please run the deployment script first");
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const CONTRACT_ADDRESS = deployment.spinTester.proxy;
    
    console.log(`🧪 Contract address: ${CONTRACT_ADDRESS}`);
    
    // Get signers
    const [signer] = await ethers.getSigners();
    console.log(`\n🔑 Signer: ${signer.address}`);
    
    // Get contract instance
    const tester = await ethers.getContractAt("UpgradableSpinTester", CONTRACT_ADDRESS);
    
    // Get current VRF cost values
    const currentVrfCostLINK = await tester.vrfCostLINK();
    const currentVrfCostETH = await tester.vrfCostETH();
    
    console.log(`\n📊 Current VRF Cost Values:`);
    console.log(`LINK: ${ethers.utils.formatEther(currentVrfCostLINK)} LINK`);
    console.log(`ETH: ${ethers.utils.formatEther(currentVrfCostETH)} ETH`);
    
    // Define new VRF cost values
    const newVrfCostLINK = ethers.utils.parseEther("0.1"); // Reduce to 0.1 LINK to match SpinTester
    const newVrfCostETH = ethers.utils.parseEther("0.05"); // Keep at 0.05 ETH
    
    console.log(`\n📝 New VRF Cost Values:`);
    console.log(`LINK: ${ethers.utils.formatEther(newVrfCostLINK)} LINK`);
    console.log(`ETH: ${ethers.utils.formatEther(newVrfCostETH)} ETH`);
    
    // Update VRF cost values
    console.log("\n🔄 Updating VRF cost values...");
    
    try {
        // Call the updateVRFParameters function
        const tx = await tester.updateVRFParameters(
            500000, // callbackGasLimit
            3,      // requestConfirmations
            1,      // numWords
            newVrfCostLINK,
            newVrfCostETH
        );
        
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Get updated VRF cost values
        const updatedVrfCostLINK = await tester.vrfCostLINK();
        const updatedVrfCostETH = await tester.vrfCostETH();
        
        console.log(`\n📊 Updated VRF Cost Values:`);
        console.log(`LINK: ${ethers.utils.formatEther(updatedVrfCostLINK)} LINK`);
        console.log(`ETH: ${ethers.utils.formatEther(updatedVrfCostETH)} ETH`);
        
        console.log("\n✅ VRF cost values updated successfully!");
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 