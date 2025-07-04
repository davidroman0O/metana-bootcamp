const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🔧 Updating CasinoSlot VRF Parameters");
    console.log("====================================");
    
    // Get network chain ID for deployment file
    const networkInfo = await ethers.provider.getNetwork();
    const chainId = networkInfo.chainId;
    
    // Load CasinoSlot deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `deployment-${chainId}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ Deployment file not found: ${deploymentPath}`);
        console.error("Available files in deployments/:");
        const deploymentDir = path.join(__dirname, '../deployments');
        if (fs.existsSync(deploymentDir)) {
            const files = fs.readdirSync(deploymentDir);
            files.forEach(file => console.error(`  - ${file}`));
        }
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const CONTRACT_ADDRESS = deployment.contracts.CasinoSlot.address;
    
    console.log(`🎰 CasinoSlot address: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
    
    // Get signers
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Signer: ${signer.address}`);
    
    // Get contract instance
    const casinoSlot = await ethers.getContractAt("CasinoSlot", CONTRACT_ADDRESS);
    
    // Get current VRF parameter values
    console.log("\n📊 Getting current VRF parameters...");
    const currentCallbackGasLimit = await casinoSlot.callbackGasLimit();
    const currentRequestConfirmations = await casinoSlot.requestConfirmations();
    const currentNumWords = await casinoSlot.numWords();
    const currentVrfCostUSD = await casinoSlot.vrfCostUSD();
    
    console.log(`\n📊 Current VRF Parameters:`);
    console.log(`Callback Gas Limit: ${currentCallbackGasLimit.toString()}`);
    console.log(`Request Confirmations: ${currentRequestConfirmations}`);
    console.log(`Number of Words: ${currentNumWords}`);
    console.log(`VRF Cost (USD cents): ${currentVrfCostUSD.toString()} cents ($${(currentVrfCostUSD.toNumber() / 100).toFixed(2)})`);
    
    // Define new VRF parameter values (fixing the gas limit issue!)
    const newCallbackGasLimit = 500000; // INCREASED from 200000 to 500000
    const newRequestConfirmations = 3;   // Keep same
    const newNumWords = 1;               // Keep same  
    const newVrfCostUSD = 600;           // Keep at $6.00 (600 cents)
    
    console.log(`\n📝 New VRF Parameters:`);
    console.log(`Callback Gas Limit: ${newCallbackGasLimit} (INCREASED to fix VRF fulfillment!)`);
    console.log(`Request Confirmations: ${newRequestConfirmations}`);
    console.log(`Number of Words: ${newNumWords}`);
    console.log(`VRF Cost (USD cents): ${newVrfCostUSD} cents ($${(newVrfCostUSD / 100).toFixed(2)})`);
    
    // Check if update is needed
    const gasLimitNeedsUpdate = currentCallbackGasLimit.toNumber() !== newCallbackGasLimit;
    const vrfCostNeedsUpdate = currentVrfCostUSD.toNumber() !== newVrfCostUSD;
    
    if (!gasLimitNeedsUpdate && !vrfCostNeedsUpdate) {
        console.log("\n✅ VRF parameters are already up to date!");
        return;
    }
    
    // Update VRF parameters
    console.log("\n🔄 Updating VRF parameters...");
    
    try {
        // Call the updateVRFParameters function
        const tx = await casinoSlot.updateVRFParameters(
            newCallbackGasLimit,
            newRequestConfirmations, 
            newNumWords,
            newVrfCostUSD
        );
        
        console.log(`📝 Transaction hash: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Get updated VRF parameter values
        console.log("\n📊 Verifying updated parameters...");
        const updatedCallbackGasLimit = await casinoSlot.callbackGasLimit();
        const updatedRequestConfirmations = await casinoSlot.requestConfirmations();
        const updatedNumWords = await casinoSlot.numWords();
        const updatedVrfCostUSD = await casinoSlot.vrfCostUSD();
        
        console.log(`\n📊 Updated VRF Parameters:`);
        console.log(`Callback Gas Limit: ${updatedCallbackGasLimit.toString()}`);
        console.log(`Request Confirmations: ${updatedRequestConfirmations}`);
        console.log(`Number of Words: ${updatedNumWords}`);
        console.log(`VRF Cost (USD cents): ${updatedVrfCostUSD.toString()} cents ($${(updatedVrfCostUSD.toNumber() / 100).toFixed(2)})`);
        
        // Show gas cost info
        console.log(`\n💰 Transaction Cost:`);
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`Gas Price: ${ethers.utils.formatUnits(receipt.effectiveGasPrice, "gwei")} gwei`);
        const txCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        console.log(`Total Cost: ${ethers.utils.formatEther(txCost)} ETH`);
        
        console.log("\n🎯 VRF ISSUE FIXED!");
        console.log("The callback gas limit has been increased from 200k to 500k gas.");
        console.log("This should resolve VRF fulfillment failures for future spins.");
        console.log("\nNote: Pending VRF requests may still fail, but new spins will work properly!");
        
    } catch (error) {
        console.error(`❌ Error updating VRF parameters: ${error.message}`);
        
        // Try to provide helpful debugging info
        if (error.message.includes("Ownable: caller is not the owner")) {
            console.error("\n🚨 PERMISSION ERROR:");
            console.error(`Current signer: ${signer.address}`);
            console.error("Only the contract owner can update VRF parameters.");
            
            try {
                const owner = await casinoSlot.owner();
                console.error(`Contract owner: ${owner}`);
            } catch (ownerError) {
                console.error("Could not retrieve contract owner");
            }
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 