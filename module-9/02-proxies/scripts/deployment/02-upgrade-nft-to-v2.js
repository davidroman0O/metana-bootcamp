const { ethers, upgrades, network } = require("hardhat");
const { getAddresses, saveAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
require('dotenv').config();

async function main() {
  // Validate required environment variables
  if (!process.env.LEDGER_ACCOUNT) {
    console.error("\n❌ ERROR: LEDGER_ACCOUNT environment variable is not set in .env file");
    console.error("Please add LEDGER_ACCOUNT=0xYourLedgerAddress to your .env file");
    process.exit(1);
  }
  
  if (!process.env.TEST_ACCOUNT) {
    console.error("\n❌ ERROR: TEST_ACCOUNT environment variable is not set in .env file");
    console.error("Please add TEST_ACCOUNT=0xYourSecondAddress to your .env file");
    process.exit(1);
  }

  console.log("Upgrading NFT contract from V1 to V2");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  
  // Get the signer account - with retry
  const [deployer] = await withRetry(
    async () => ethers.getSigners(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const deployerAddress = await withRetry(
    async () => deployer.getAddress(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("Upgrading with account:", deployerAddress);
  
  // Show Ledger instructions if we're on a real network (not localhost/hardhat)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:");
    console.log("  1. Your device is connected via USB");
    console.log("  2. The device is unlocked");
    console.log("  3. The Ethereum app is open");
    console.log("  4. Contract data is allowed in the Ethereum app settings\n");
  }
  
  // Get the saved proxy address
  const addresses = getAddresses(network.name, "nft");
  
  if (!addresses || !addresses.proxy) {
    console.error("No proxy address found. Please deploy the V1 contract first.");
    process.exit(1);
  }
  
  const proxyAddress = addresses.proxy;
  console.log("\nUsing proxy address:", proxyAddress);
  
  // Get original implementation address
  const originalImplementation = addresses.implementationV1;
  if (!originalImplementation) {
    console.error("No V1 implementation address found. Please deploy the V1 contract first.");
    process.exit(1);
  }
  console.log("Original V1 implementation:", originalImplementation);
  
  // Check if it's already upgraded to V2
  if (addresses.implementationV2) {
    console.log("\n⚠️ This proxy has already been upgraded to V2.");
    console.log("V1 implementation:", addresses.implementationV1);
    console.log("V2 implementation:", addresses.implementationV2);
    
    // Check if the contract has god mode function (V2 feature)
    console.log("\nVerifying V2 functionality (checking for godModeTransfer function)...");
    try {
      const nftFactory = await withRetry(
        async () => ethers.getContractFactory("contracts/01-SimpleNFT_V2.sol:FacesNFT"),
        { maxRetries: 3, initialDelay: 5000 }
      );
      
      const nft = nftFactory.attach(proxyAddress);
      
      // Check if the function exists by getting its signature
      const functionSignature = "godModeTransfer(address,address,uint256)";
      const functionSelector = ethers.id(functionSignature).substring(0, 10); // First 4 bytes of the hash
      
      // Try to get the contract code to check if it contains the function selector
      const code = await withRetry(
        async () => ethers.provider.getCode(proxyAddress),
        { maxRetries: 3, initialDelay: 5000 }
      );
      
      if (code.includes(functionSelector.substring(2))) { // Remove 0x prefix when checking
        console.log("✅ V2 feature (godModeTransfer) is present in the contract.");
        console.log("\nProxy appears to be correctly upgraded to V2 already.");
        console.log("If you want to deploy a new proxy for testing, use the V1 deployment script first.");
        return;
      } else {
        console.log("⚠️ V2 feature not found, attempting to upgrade again...");
      }
    } catch (error) {
      console.log("⚠️ Error checking V2 functionality:", error.message);
      console.log("Proceeding with upgrade attempt...");
    }
  }
  
  // Use the V2 contract with godModeTransfer function
  console.log("\nUpgrading to FacesNFT V2 with god mode capability...");
  const FacesNFTv2 = await withRetry(
    async () => ethers.getContractFactory("contracts/01-SimpleNFT_V2.sol:FacesNFT"),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  // Perform the upgrade with retry
  const upgradedProxy = await withRetry(
    async () => upgrades.upgradeProxy(proxyAddress, FacesNFTv2),
    { 
      maxRetries: 3, 
      initialDelay: 5000,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}: Attempting to upgrade proxy again...`);
      }
    }
  );
  
  await withRetry(
    async () => upgradedProxy.waitForDeployment(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  // Try to get transaction hash if available
  let txHash = null;
  try {
    const deployTx = upgradedProxy.deploymentTransaction();
    if (deployTx && deployTx.hash) {
      txHash = deployTx.hash;
      console.log("Upgrade transaction hash:", txHash);
    } else {
      console.log("Upgrade transaction completed, but transaction hash not available");
    }
  } catch (error) {
    console.log("Upgrade completed, but couldn't retrieve transaction details:", error.message);
  }
  
  // Generate Etherscan URL for non-local networks if we have a hash
  if (network.name !== "hardhat" && network.name !== "localhost" && txHash) {
    let etherscanBaseUrl;
    if (network.name === "sepolia") {
      etherscanBaseUrl = "https://sepolia.etherscan.io";
    } else if (network.name === "mainnet") {
      etherscanBaseUrl = "https://etherscan.io";
    } else {
      etherscanBaseUrl = `https://${network.name}.etherscan.io`;
    }
    
    const etherscanTxUrl = `${etherscanBaseUrl}/tx/${txHash}`;
    console.log("View transaction on Etherscan:", etherscanTxUrl);
  }
  
  // Always provide contract URL
  if (network.name !== "hardhat" && network.name !== "localhost") {
    let etherscanBaseUrl;
    if (network.name === "sepolia") {
      etherscanBaseUrl = "https://sepolia.etherscan.io";
    } else if (network.name === "mainnet") {
      etherscanBaseUrl = "https://etherscan.io";
    } else {
      etherscanBaseUrl = `https://${network.name}.etherscan.io`;
    }
    
    const etherscanContractUrl = `${etherscanBaseUrl}/address/${proxyAddress}`;
    console.log("View contract on Etherscan:", etherscanContractUrl);
  }
  
  // Get the new implementation address with retry
  const newImplementationAddress = await withRetry(
    async () => upgrades.erc1967.getImplementationAddress(proxyAddress),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("New V2 implementation address:", newImplementationAddress);
  
  // Check if implementation address changed
  if (newImplementationAddress.toLowerCase() === originalImplementation.toLowerCase()) {
    console.log("\n⚠️ WARNING: Implementation address did not change!");
    console.log("This could indicate one of the following issues:");
    console.log("  1. The V2 contract might not have significant bytecode changes");
    console.log("  2. The OpenZeppelin Upgrades plugin is reusing the same implementation");
    console.log("\nTrying to verify V2 functionality nonetheless...");
  } else {
    console.log("\n✅ Implementation address changed successfully!");
  }
  
  // Test if V2 functionality is available instead of just checking addresses
  const nft = FacesNFTv2.attach(proxyAddress);
  let v2Verified = false;
  
  try {
    // Check if the function exists (will throw if not available)
    const hasGodModeFunction = !!nft.interface.getFunction("godModeTransfer");
    console.log("Contract has godModeTransfer function:", hasGodModeFunction);
    
    // Check if version() function exists and returns "v2"
    const version = await withRetry(
      async () => nft.version(),
      { maxRetries: 3, initialDelay: 5000 }
    );
    console.log("Version:", version);
    
    v2Verified = hasGodModeFunction && version === "v2";
  } catch (error) {
    console.log("Error checking V2 functionality:", error.message);
    v2Verified = false;
  }
  
  if (v2Verified) {
    console.log("✅ V2 functionality verified!");
  } else {
    console.log("❌ Could not verify V2 functionality.");
    if (newImplementationAddress.toLowerCase() === originalImplementation.toLowerCase()) {
      console.error("Implementation address did not change and V2 functionality not verified.");
      console.error("This indicates a problem with the upgrade process.");
      process.exit(1);
    }
  }
  
  // Save the V2 implementation address alongside V1
  saveAddresses(network.name, "nft", {
    proxy: proxyAddress,
    implementationV1: originalImplementation,
    implementationV2: newImplementationAddress,
    admin: deployerAddress
  });
  
  console.log("\n✅ Upgrade from V1 to V2 complete!");
  console.log("Contract now has god mode capability.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 