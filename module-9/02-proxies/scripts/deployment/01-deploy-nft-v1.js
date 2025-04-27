const { ethers, upgrades, network } = require("hardhat");
const { saveAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
const hre = require("hardhat");
require('dotenv').config();

async function main() {
  // Clean and recompile before deploying
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

  console.log("Deploying NFT V1 contract");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  
  // Get the signer account with retry
  const [deployer] = await withRetry(
    async () => ethers.getSigners(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const deployerAddress = await withRetry(
    async () => deployer.getAddress(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("Deploying with account:", deployerAddress);
  
  // Show Ledger instructions if we're on a real network (not localhost/hardhat)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:");
    console.log("  1. Your device is connected via USB");
    console.log("  2. The device is unlocked");
    console.log("  3. The Ethereum app is open");
    console.log("  4. Contract data is allowed in the Ethereum app settings\n");
  }
  
  // Deploy V1 NFT contract with retry
  console.log("\nDeploying FacesNFT V1...");
  const FacesNFT = await withRetry(
    async () => ethers.getContractFactory("contracts/01-SimpleNFT.sol:FacesNFT"),
    { maxRetries: 3, initialDelay: 5000 }
  );

  // Check for V2 features in V1 contract (fail fast)
  if (FacesNFT.interface.getFunction && FacesNFT.interface.getFunction("godModeTransfer")) {
    throw new Error("V1 contract already has godModeTransfer! Artifacts or deployment may be mixed up. Aborting.");
  }
  
  const facesNFT = await withRetry(
    async () => upgrades.deployProxy(FacesNFT, [], { 
      kind: "uups",
      initializer: "initialize"
    }),
    { 
      maxRetries: 3, 
      initialDelay: 5000,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}: Attempting to deploy proxy again...`);
      }
    }
  );
  
  await withRetry(
    async () => facesNFT.waitForDeployment(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const nftAddress = await withRetry(
    async () => facesNFT.getAddress(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("FacesNFT V1 deployed to:", nftAddress);
  
  // Get transaction hash for Etherscan link
  const deployTx = facesNFT.deploymentTransaction();
  console.log("Deployment transaction hash:", deployTx.hash);
  
  // Generate Etherscan URL for non-local networks
  if (network.name !== "hardhat" && network.name !== "localhost") {
    let etherscanBaseUrl;
    if (network.name === "sepolia") {
      etherscanBaseUrl = "https://sepolia.etherscan.io";
    } else if (network.name === "mainnet") {
      etherscanBaseUrl = "https://etherscan.io";
    } else {
      etherscanBaseUrl = `https://${network.name}.etherscan.io`;
    }
    
    const etherscanTxUrl = `${etherscanBaseUrl}/tx/${deployTx.hash}`;
    const etherscanContractUrl = `${etherscanBaseUrl}/address/${nftAddress}`;
    
    console.log("View transaction on Etherscan:", etherscanTxUrl);
    console.log("View contract on Etherscan:", etherscanContractUrl);
  }
  
  // Get implementation address with retry
  const implementationAddress = await withRetry(
    async () => upgrades.erc1967.getImplementationAddress(nftAddress),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("Implementation V1 address:", implementationAddress);
  
  // Save the deployed addresses
  saveAddresses(network.name, "nft", {
    proxy: nftAddress,
    implementationV1: implementationAddress,
    admin: deployerAddress
  });
  
  // Verify the contract functionality
  console.log("\n==== VERIFYING CONTRACT FUNCTIONALITY ====");
  
  try {
    console.log("Connecting to deployed contract...");
    
    // Check for basic V1 functionality
    console.log("\nTesting version() function...");
    const version = await withRetry(
      async () => facesNFT.version(),
      { maxRetries: 3, initialDelay: 2000 }
    );
    
    console.log("Version:", version);
    
    if (version === "v1") {
      console.log("✅ Contract correctly returns version v1");
    } else {
      console.log("❌ Unexpected version:", version);
    }
    
    // Check if we can mint an NFT
    console.log("\nTesting mint function...");
    if (network.name === "hardhat" || network.name === "localhost") {
      // Only try minting on test networks to avoid mainnet costs
      try {
        const mintTx = await withRetry(
          async () => facesNFT.mint(),
          { maxRetries: 2, initialDelay: 2000 }
        );
        
        await withRetry(
          async () => mintTx.wait(),
          { maxRetries: 2, initialDelay: 2000 }
        );
        
        console.log("✅ Successfully minted an NFT");
        
        // Check if the NFT was minted
        const tokenId = 1;
        const ownerAddress = await withRetry(
          async () => facesNFT.ownerOf(tokenId),
          { maxRetries: 2, initialDelay: 2000 }
        );
        
        console.log(`Owner of token #${tokenId}: ${ownerAddress}`);
        console.log("✅ NFT ownership verified");
      } catch (error) {
        console.log("❌ Failed to mint NFT:", error.message);
      }
    } else {
      console.log("⚠️ Skipping mint test on production network to avoid costs");
    }
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
  }
  
  console.log("\n==== END VERIFICATION ====");
  
  console.log("\nV1 Deployment complete!");
  console.log("Use this proxy address for upgrading to V2:", nftAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 