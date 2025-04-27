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

  console.log("Deploying Exchange system");
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
  
  // Deploy Token contract
  console.log("\nDeploying ExchangeVisageToken...");
  const ExchangeVisageToken = await ethers.getContractFactory("ExchangeVisageToken");
  const token = await upgrades.deployProxy(ExchangeVisageToken, [deployerAddress], { kind: "uups" });
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  const tokenImplAddress = await upgrades.erc1967.getImplementationAddress(tokenAddress);
  console.log("ExchangeVisageToken deployed to:", tokenAddress);
  console.log("Implementation address:", tokenImplAddress);
  
  // Get token transaction hash for Etherscan link
  const tokenDeployTx = token.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const tokenEtherscanUrl = getEtherscanUrl(network.name, "tx", tokenDeployTx.hash);
    console.log("View transaction on Etherscan:", tokenEtherscanUrl);
  }

  // Deploy NFT for Exchange
  console.log("\nDeploying ExchangeVisageNFT...");
  const ExchangeVisageNFT = await ethers.getContractFactory("ExchangeVisageNFT");
  const nft = await upgrades.deployProxy(ExchangeVisageNFT, [deployerAddress], { kind: "uups" });
  await nft.waitForDeployment();
  const nftExchangeAddress = await nft.getAddress();
  const nftImplAddress = await upgrades.erc1967.getImplementationAddress(nftExchangeAddress);
  console.log("ExchangeVisageNFT deployed to:", nftExchangeAddress);
  console.log("Implementation address:", nftImplAddress);
  
  // Get NFT transaction hash for Etherscan link
  const nftDeployTx = nft.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const nftEtherscanUrl = getEtherscanUrl(network.name, "tx", nftDeployTx.hash);
    console.log("View transaction on Etherscan:", nftEtherscanUrl);
  }

  // Deploy Exchange
  console.log("\nDeploying VisageExchange...");
  const VisageExchange = await ethers.getContractFactory("VisageExchange");
  const exchange = await upgrades.deployProxy(VisageExchange, [
    deployerAddress,
    tokenAddress,
    nftExchangeAddress
  ], { kind: "uups" });
  await exchange.waitForDeployment();
  const exchangeAddress = await exchange.getAddress();
  const exchangeImplAddress = await upgrades.erc1967.getImplementationAddress(exchangeAddress);
  console.log("VisageExchange deployed to:", exchangeAddress);
  console.log("Implementation address:", exchangeImplAddress);
  
  // Get exchange transaction hash for Etherscan link
  const exchangeDeployTx = exchange.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const exchangeEtherscanUrl = getEtherscanUrl(network.name, "tx", exchangeDeployTx.hash);
    console.log("View transaction on Etherscan:", exchangeEtherscanUrl);
  }

  // Transfer ownership of the NFT and token to the exchange
  console.log("\nTransferring token ownership to exchange...");
  const tokenTx = await token.transferOwnership(exchangeAddress);
  console.log("Transferring NFT ownership to exchange...");
  const nftTx = await nft.transferOwnership(exchangeAddress);
  await Promise.all([tokenTx.wait(), nftTx.wait()]);
  console.log("✅ Ownership transferred to exchange");
  
  // Show ownership transfer transactions on Etherscan
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Token ownership transfer:", getEtherscanUrl(network.name, "tx", tokenTx.hash));
    console.log("NFT ownership transfer:", getEtherscanUrl(network.name, "tx", nftTx.hash));
  }

  // Save the deployed addresses
  saveAddresses(network.name, "exchange", {
    token: tokenAddress,
    tokenImpl: tokenImplAddress,
    nft: nftExchangeAddress,
    nftImpl: nftImplAddress,
    exchange: exchangeAddress,
    exchangeImpl: exchangeImplAddress,
    admin: deployerAddress
  });
  
  // Show contract addresses on Etherscan
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nContract Etherscan links:");
    console.log("Token:", getEtherscanUrl(network.name, "address", tokenAddress));
    console.log("NFT:", getEtherscanUrl(network.name, "address", nftExchangeAddress));
    console.log("Exchange:", getEtherscanUrl(network.name, "address", exchangeAddress));
  }
  
  console.log("\nExchange system deployment complete!");
}

// Helper function to generate Etherscan URLs
function getEtherscanUrl(network, type, hash) {
  let baseUrl;
  if (network === "sepolia") {
    baseUrl = "https://sepolia.etherscan.io";
  } else if (network === "mainnet") {
    baseUrl = "https://etherscan.io";
  } else {
    baseUrl = `https://${network}.etherscan.io`;
  }
  
  return `${baseUrl}/${type}/${hash}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 