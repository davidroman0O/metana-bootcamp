const { ethers, upgrades, network } = require("hardhat");
const { saveAddresses } = require("../utils/addresses");

async function main() {
  console.log("Deploying Staking system");
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
  
  // Deploy Staking Token contract
  console.log("\nDeploying StakingVisageToken...");
  const StakingVisageToken = await ethers.getContractFactory("StakingVisageToken");
  const stakingToken = await upgrades.deployProxy(
    StakingVisageToken, 
    [deployerAddress], 
    { kind: "uups" }
  );
  await stakingToken.waitForDeployment();
  const stakingTokenAddress = await stakingToken.getAddress();
  const tokenImplAddress = await upgrades.erc1967.getImplementationAddress(stakingTokenAddress);
  console.log("StakingVisageToken deployed to:", stakingTokenAddress);
  console.log("Implementation address:", tokenImplAddress);
  
  // Get token transaction hash for Etherscan link
  const tokenDeployTx = stakingToken.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const tokenEtherscanUrl = getEtherscanUrl(network.name, "tx", tokenDeployTx.hash);
    console.log("View transaction on Etherscan:", tokenEtherscanUrl);
  }

  // Deploy Staking NFT contract
  console.log("\nDeploying StakingVisageNFT...");
  const StakingVisageNFT = await ethers.getContractFactory("StakingVisageNFT");
  const stakingNFT = await upgrades.deployProxy(
    StakingVisageNFT, 
    [deployerAddress], 
    { kind: "uups" }
  );
  await stakingNFT.waitForDeployment();
  const stakingNFTAddress = await stakingNFT.getAddress();
  const nftImplAddress = await upgrades.erc1967.getImplementationAddress(stakingNFTAddress);
  console.log("StakingVisageNFT deployed to:", stakingNFTAddress);
  console.log("Implementation address:", nftImplAddress);
  
  // Get NFT transaction hash for Etherscan link
  const nftDeployTx = stakingNFT.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const nftEtherscanUrl = getEtherscanUrl(network.name, "tx", nftDeployTx.hash);
    console.log("View transaction on Etherscan:", nftEtherscanUrl);
  }

  // Deploy Staking contract
  console.log("\nDeploying VisageStaking...");
  const VisageStaking = await ethers.getContractFactory("VisageStaking");
  const staking = await upgrades.deployProxy(
    VisageStaking, 
    [
      deployerAddress,
      stakingTokenAddress,
      stakingNFTAddress
    ], 
    { kind: "uups" }
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  const stakingImplAddress = await upgrades.erc1967.getImplementationAddress(stakingAddress);
  console.log("VisageStaking deployed to:", stakingAddress);
  console.log("Implementation address:", stakingImplAddress);
  
  // Get staking contract transaction hash for Etherscan link
  const stakingDeployTx = staking.deploymentTransaction();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    const stakingEtherscanUrl = getEtherscanUrl(network.name, "tx", stakingDeployTx.hash);
    console.log("View transaction on Etherscan:", stakingEtherscanUrl);
  }

  // Transfer ownership of the NFT and token to the staking contract
  console.log("\nTransferring staking token ownership to staking contract...");
  const tokenTx = await stakingToken.transferOwnership(stakingAddress);
  console.log("Transferring staking NFT ownership to staking contract...");
  const nftTx = await stakingNFT.transferOwnership(stakingAddress);
  await Promise.all([tokenTx.wait(), nftTx.wait()]);
  console.log("✅ Ownership transferred to staking contract");
  
  // Show ownership transfer transactions on Etherscan
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Token ownership transfer:", getEtherscanUrl(network.name, "tx", tokenTx.hash));
    console.log("NFT ownership transfer:", getEtherscanUrl(network.name, "tx", nftTx.hash));
  }

  // Save the deployed addresses
  saveAddresses(network.name, "staking", {
    token: stakingTokenAddress,
    tokenImpl: tokenImplAddress,
    nft: stakingNFTAddress,
    nftImpl: nftImplAddress,
    staking: stakingAddress,
    stakingImpl: stakingImplAddress,
    admin: deployerAddress
  });
  
  // Show contract addresses on Etherscan
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nContract Etherscan links:");
    console.log("Token:", getEtherscanUrl(network.name, "address", stakingTokenAddress));
    console.log("NFT:", getEtherscanUrl(network.name, "address", stakingNFTAddress));
    console.log("Staking:", getEtherscanUrl(network.name, "address", stakingAddress));
  }
  
  console.log("\nStaking system deployment complete!");
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