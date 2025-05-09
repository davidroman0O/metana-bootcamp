const { ethers, upgrades, network, artifacts } = require("hardhat");
const hre = require("hardhat");
const { getAddresses, saveAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

async function main() {
  // Clean and recompile before upgrading
  await hre.run("clean");
  await hre.run("compile");

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
  
  // ==== BYTECODE COMPARISON ====
  console.log("\n==== COMPARING CONTRACT BYTECODE ====");
  
  // Get factories for both versions
  console.log("\nGetting contract factories for both versions...");
  const FacesNFTv1 = await withRetry(
    async () => ethers.getContractFactory("contracts/01-SimpleNFT.sol:FacesNFT"),
    { maxRetries: 3, initialDelay: 2000 }
  );
  
  // We'll reuse this variable later for the upgrade
  let FacesNFTv2 = await withRetry(
    async () => ethers.getContractFactory("contracts/01-SimpleNFT_V2.sol:FacesNFT"),
    { maxRetries: 3, initialDelay: 2000 }
  );
  
  // Get bytecode for both versions
  const v1Bytecode = FacesNFTv1.bytecode;
  const v2Bytecode = FacesNFTv2.bytecode;
  
  // Compare bytecode lengths
  console.log(`V1 bytecode length: ${v1Bytecode.length} characters`);
  console.log(`V2 bytecode length: ${v2Bytecode.length} characters`);
  
  if (v1Bytecode === v2Bytecode) {
    console.log("\n⚠️ WARNING: V1 and V2 have IDENTICAL bytecode!");
    console.log("OpenZeppelin Upgrades will likely reuse the same implementation address.");
    console.log("The upgrade may proceed, but no new implementation contract will be deployed.");
  } else {
    console.log("\n✅ V1 and V2 have DIFFERENT bytecode.");
    
    // Calculate a simple difference metric (not perfect but gives an idea)
    let differentChars = 0;
    const minLength = Math.min(v1Bytecode.length, v2Bytecode.length);
    
    for (let i = 0; i < minLength; i++) {
      if (v1Bytecode[i] !== v2Bytecode[i]) {
        differentChars++;
      }
    }
    
    // Add the length difference to the different characters
    differentChars += Math.abs(v1Bytecode.length - v2Bytecode.length);
    
    // Calculate percentage difference
    const percentDiff = (differentChars / Math.max(v1Bytecode.length, v2Bytecode.length)) * 100;
    
    console.log(`Bytecode differs by approximately ${percentDiff.toFixed(2)}%`);
    console.log("OpenZeppelin Upgrades should deploy a new implementation contract.");
  }
  console.log("\n==== END BYTECODE COMPARISON ====\n");
  
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
  // Already have FacesNFTv2 factory from earlier
  
  // Save implementation address before upgrade
  const beforeImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  // 1. Deploy the new V2 implementation contract first
  console.log("\nDeploying V2 implementation contract (if necessary)...");
  const v2ImplAddress = await withRetry(
    async () => upgrades.prepareUpgrade(proxyAddress, FacesNFTv2),
    { 
      maxRetries: 3, 
      initialDelay: 5000,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}: Attempting to deploy V2 implementation again... Error: ${error.message}`);
      }
    }
  );
  console.log("✅ V2 implementation deployed/fetched:", v2ImplAddress);

  // 2. Upgrade the proxy to point to the new implementation address MANUALLY
  console.log(`\nAttempting to manually call upgradeTo on proxy (${proxyAddress}) with new implementation (${v2ImplAddress})...`);

  // Minimal ABI for the UUPS upgradeTo function
  const proxyABI = [
    "function upgradeTo(address newImplementation) external",
    // Include Owner event if needed for verification, or AdminChanged if using Transparent Proxy standard
    // "event Upgraded(address indexed implementation)" // Standard OpenZeppelin UUPS event
  ];

  // Create contract instance for the proxy using the minimal ABI and the deployer signer
  const proxyContract = new ethers.Contract(proxyAddress, proxyABI, deployer);

  let upgradeTx;
  try {
    console.log(`Sending upgradeTo(${v2ImplAddress}) transaction...`);
    // The deployer is the owner, so this call should succeed
    upgradeTx = await withRetry(
        async () => proxyContract.upgradeTo(v2ImplAddress),
        { 
          maxRetries: 3, 
          initialDelay: 5000,
          onRetry: (attempt, error) => {
            console.log(`Retry ${attempt}: Attempting manual upgradeTo transaction again... Error: ${error.message}`);
          }
        }
      );

    console.log("Upgrade transaction sent, hash:", upgradeTx.hash);
    console.log("Waiting for transaction confirmation...");
    await upgradeTx.wait(); // Wait for the transaction to be mined
    console.log("✅ Manual upgradeTo transaction confirmed.");
  
  } catch (error) {
      console.error("❌ Error sending manual upgradeTo transaction:", error.message);
      console.error("Full error object:", error);
      process.exit(1);
  }
  
  // It might take a moment for the upgrade transaction to propagate
  console.log("Waiting a few seconds for the upgrade transaction to be mined and state to update...");
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

  // Re-fetch the implementation address *after* the upgrade transaction
  console.log("Verifying implementation address after upgrade...");
  const afterImpl = await withRetry(
    async () => upgrades.erc1967.getImplementationAddress(proxyAddress),
    { maxRetries: 5, initialDelay: 3000 } // Increase retries/delay for verification
  );

  console.log("Implementation address after upgrade transaction:", afterImpl);

  // Check if the final implementation address matches the V2 address we deployed
  if (v2ImplAddress.toLowerCase() !== afterImpl.toLowerCase()) {
    console.error(`❌ ERROR: Proxy implementation address (${afterImpl}) does not match the deployed V2 implementation (${v2ImplAddress})!`);
    console.error("The proxy upgrade might have failed or pointed to an unexpected address.");
    // Optionally, you could attempt to attach to `afterImpl` and check its version here
    // For now, we exit if the addresses don't match the expectation
    process.exit(1); 
  } else {
    console.log("✅ Proxy implementation address successfully updated to V2 address.");
  }

  // Check if the implementation address actually changed during the process.
  // This is mostly informational now, as the critical check is above.
  if (beforeImpl.toLowerCase() === afterImpl.toLowerCase()) {
    // Check if V2 features are present and version is 'v2' (allow if so)
    const nft = FacesNFTv2.attach(proxyAddress);
    let version = null;
    try {
      version = await nft.version();
    } catch (e) {}
    const hasGodMode = nft.interface.getFunction && nft.interface.getFunction("godModeTransfer");
    if (!(version === "v2" && hasGodMode)) {
      throw new Error("Implementation address did not change and V2 features not present! Upgrade may not have worked.");
    } else {
      console.log("Implementation address did not change, but V2 features are present and version() returns 'v2'. Proceeding.");
    }
  }
  
  // Get transaction hash for Etherscan link
  const txHash = upgradeTx ? upgradeTx.hash : null;
  if (txHash) {
    console.log("Manual upgrade transaction hash:", txHash);
  } else {
    console.log("Upgrade completed, but couldn't retrieve transaction details");
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
  
  // Test if V2 functionality is available instead of just checking addresses
  const nft = FacesNFTv2.attach(proxyAddress);
  let v2Verified = false;
  
  console.log("\n==== VERIFYING V2 FUNCTIONALITY ====");
  
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
    
    // CRITICAL CHECK: Make sure the implementation actually returns "v2"
    if (version === "v2") {
      console.log("✅ Contract correctly returns version 'v2'");
    } else {
      console.error("❌ ERROR: Contract returns version '" + version + "' instead of 'v2'");
      console.error("This indicates the upgrade did not correctly apply the V2 implementation code");
      if (v2ImplAddress.toLowerCase() === originalImplementation.toLowerCase()) {
        console.error("The implementation address remained the same, which explains why the version didn't change");
        console.error("You need to make more significant changes to the V2 contract to force a new implementation");
      }
      v2Verified = false;
      process.exit(1);
    }
    
    // Check for new functions added in V2
    console.log("\nVerifying existence of V2-specific functions:");
    
    // Check if exists() function is available (V2 only)
    const hasExistsFunction = !!nft.interface.getFunction("exists");
    console.log("Contract has exists() function:", hasExistsFunction);
    
    // Try to call godModeTransfer if we're on a test network
    if (network.name === "hardhat" || network.name === "localhost") {
      console.log("\nAttempting to test godModeTransfer functionality...");
      try {
        // We need an existing token to transfer
        const currentTokenId = await withRetry(
          async () => nft.currentTokenId(),
          { maxRetries: 2, initialDelay: 2000 }
        );
        
        if (currentTokenId > 0) {
          const tokenId = 1; // Use the first token
          const ownerBefore = await withRetry(
            async () => nft.ownerOf(tokenId),
            { maxRetries: 2, initialDelay: 2000 }
          );
          
          console.log(`Token #${tokenId} is owned by: ${ownerBefore}`);
          
          // Use the TEST_ACCOUNT as the recipient
          const recipient = process.env.TEST_ACCOUNT;
          console.log(`Testing godModeTransfer from ${ownerBefore} to ${recipient}...`);
          
          const transferTx = await withRetry(
            async () => nft.godModeTransfer(ownerBefore, recipient, tokenId),
            { maxRetries: 2, initialDelay: 2000 }
          );
          
          await withRetry(
            async () => transferTx.wait(),
            { maxRetries: 2, initialDelay: 5000 }
          );
          
          // Verify the transfer worked
          const ownerAfter = await withRetry(
            async () => nft.ownerOf(tokenId),
            { maxRetries: 2, initialDelay: 2000 }
          );
          
          console.log(`After godModeTransfer, token #${tokenId} is owned by: ${ownerAfter}`);
          
          if (ownerAfter.toLowerCase() === recipient.toLowerCase()) {
            console.log("✅ godModeTransfer function works correctly!");
          } else {
            console.log("❌ godModeTransfer did not change ownership as expected");
          }
        } else {
          console.log("No tokens minted yet, cannot test godModeTransfer");
        }
      } catch (error) {
        console.log("❌ Error testing godModeTransfer:", error.message);
      }
    } else {
      console.log("⚠️ Skipping godModeTransfer test on production network");
    }
    
    // Final verification based on all checks
    v2Verified = hasGodModeFunction && version === "v2" && hasExistsFunction;
  } catch (error) {
    console.log("Error checking V2 functionality:", error.message);
    v2Verified = false;
  }
  
  console.log("\n==== VERIFICATION SUMMARY ====");
  
  if (v2Verified) {
    console.log("✅ V2 functionality fully verified!");
    
    if (v2ImplAddress.toLowerCase() === originalImplementation.toLowerCase()) {
      console.log("\n⚠️ NOTE: The implementation address did not change, but V2 functionality is working.");
      console.log("This may mean the OpenZeppelin Upgrades plugin determined the bytecode was similar enough");
      console.log("to reuse the implementation, but the proxy was still updated with the new V2 interface.");
    } else {
      console.log("\n✅ New implementation deployed and working correctly.");
    }
  } else {
    console.log("❌ Could not verify V2 functionality.");
    if (v2ImplAddress.toLowerCase() === originalImplementation.toLowerCase()) {
      console.error("Implementation address did not change and V2 functionality not verified.");
      console.error("This indicates a problem with the upgrade process.");
      process.exit(1);
    }
  }
  
  // Save the V2 implementation address alongside V1
  saveAddresses(network.name, "nft", {
    proxy: proxyAddress,
    implementationV1: originalImplementation,
    implementationV2: v2ImplAddress,
    admin: deployerAddress
  });
  
  console.log("\n✅ Upgrade from V1 to V2 complete!");
  console.log("Contract now has god mode capability.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 