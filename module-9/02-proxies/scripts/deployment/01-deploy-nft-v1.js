const { ethers, upgrades, network } = require("hardhat");
const { saveAddresses } = require("../utils/addresses");
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

  console.log("Deploying NFT V1 contract");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  
  // Get the signer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying with account:", deployerAddress);
  
  // Show Ledger instructions if we're on a real network (not localhost/hardhat)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:");
    console.log("  1. Your device is connected via USB");
    console.log("  2. The device is unlocked");
    console.log("  3. The Ethereum app is open");
    console.log("  4. Contract data is allowed in the Ethereum app settings\n");
  }
  
  // Deploy V1 NFT contract
  console.log("\nDeploying FacesNFT V1...");
  const FacesNFT = await ethers.getContractFactory("contracts/01-SimpleNFT.sol:FacesNFT");
  
  const facesNFT = await upgrades.deployProxy(FacesNFT, [], { 
    kind: "uups",
    initializer: "initialize"
  });
  await facesNFT.waitForDeployment();
  
  const nftAddress = await facesNFT.getAddress();
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
  
  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(nftAddress);
  console.log("Implementation V1 address:", implementationAddress);
  
  // Save the deployed addresses
  saveAddresses(network.name, "nft", {
    proxy: nftAddress,
    implementationV1: implementationAddress,
    admin: deployerAddress
  });
  
  console.log("\nV1 Deployment complete!");
  console.log("Use this proxy address for upgrading to V2:", nftAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 