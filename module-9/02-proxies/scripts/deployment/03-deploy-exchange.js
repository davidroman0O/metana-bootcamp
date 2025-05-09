const { ethers, upgrades, network } = require("hardhat");
const { saveAddresses } = require("../utils/addresses");
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

  console.log("Deploying Exchange system");
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
  
  // Deploy Token contract with retry
  console.log("\nDeploying ExchangeVisageToken...");
  const ExchangeVisageToken = await withRetry(
    async () => ethers.getContractFactory("ExchangeVisageToken"),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const token = await withRetry(
    async () => upgrades.deployProxy(ExchangeVisageToken, [deployerAddress], { kind: "uups" }),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  await withRetry(
    async () => token.waitForDeployment(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const tokenAddress = await withRetry(
    async () => token.getAddress(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const tokenImplAddress = await withRetry(
    async () => upgrades.erc1967.getImplementationAddress(tokenAddress),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("ExchangeVisageToken deployed to:", tokenAddress);
  console.log("Implementation address:", tokenImplAddress);
  
  // Get token transaction hash for Etherscan link
  const tokenDeployTx = token.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const tokenEtherscanUrl = getEtherscanUrl(network.name, "tx", tokenDeployTx.hash);
    console.log("View transaction on Etherscan:", tokenEtherscanUrl);
  }

  // Deploy NFT for Exchange with retry
  console.log("\nDeploying ExchangeVisageNFT...");
  const ExchangeVisageNFT = await withRetry(
    async () => ethers.getContractFactory("ExchangeVisageNFT"),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const nft = await withRetry(
    async () => upgrades.deployProxy(ExchangeVisageNFT, [deployerAddress], { kind: "uups" }),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  await withRetry(
    async () => nft.waitForDeployment(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const nftExchangeAddress = await withRetry(
    async () => nft.getAddress(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const nftImplAddress = await withRetry(
    async () => upgrades.erc1967.getImplementationAddress(nftExchangeAddress),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("ExchangeVisageNFT deployed to:", nftExchangeAddress);
  console.log("Implementation address:", nftImplAddress);
  
  // Get NFT transaction hash for Etherscan link
  const nftDeployTx = nft.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const nftEtherscanUrl = getEtherscanUrl(network.name, "tx", nftDeployTx.hash);
    console.log("View transaction on Etherscan:", nftEtherscanUrl);
  }

  // Deploy Exchange with retry
  console.log("\nDeploying VisageExchange...");
  const VisageExchange = await withRetry(
    async () => ethers.getContractFactory("VisageExchange"),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const exchange = await withRetry(
    async () => upgrades.deployProxy(VisageExchange, [
      deployerAddress,
      tokenAddress,
      nftExchangeAddress
    ], { kind: "uups" }),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  await withRetry(
    async () => exchange.waitForDeployment(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const exchangeAddress = await withRetry(
    async () => exchange.getAddress(),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  const exchangeImplAddress = await withRetry(
    async () => upgrades.erc1967.getImplementationAddress(exchangeAddress),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("VisageExchange deployed to:", exchangeAddress);
  console.log("Implementation address:", exchangeImplAddress);
  
  // Get exchange transaction hash for Etherscan link
  const exchangeDeployTx = exchange.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const exchangeEtherscanUrl = getEtherscanUrl(network.name, "tx", exchangeDeployTx.hash);
    console.log("View transaction on Etherscan:", exchangeEtherscanUrl);
  }

  // Transfer ownership of the NFT and token to the exchange with retry
  console.log("\nTransferring token ownership to exchange...");
  const tokenTx = await withRetry(
    async () => token.transferOwnership(exchangeAddress),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  console.log("Transferring NFT ownership to exchange...");
  const nftTx = await withRetry(
    async () => nft.transferOwnership(exchangeAddress),
    { maxRetries: 3, initialDelay: 5000 }
  );
  
  await Promise.all([
    withRetry(async () => tokenTx.wait(), { maxRetries: 3, initialDelay: 5000 }),
    withRetry(async () => nftTx.wait(), { maxRetries: 3, initialDelay: 5000 })
  ]);
  
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