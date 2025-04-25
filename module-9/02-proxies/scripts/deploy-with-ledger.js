const { ethers, upgrades, network } = require("hardhat");
const { saveAddresses } = require("./utils/addresses");

async function main() {
  console.log("Deploying all contracts to Sepolia using Ledger wallet");
  console.log("Network:", network.name);
  
  // Get the signer from the Ledger account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying with the Ledger account:", deployerAddress);
  
  // Reminder for the user
  console.log("\n⚠️ IMPORTANT: Please ensure your Ledger device is:");
  console.log("  1. Connected via USB");
  console.log("  2. Unlocked");
  console.log("  3. Ethereum app is open");
  console.log("  4. Contract data is allowed in the Ethereum app settings\n");
  
  // ================ 1. DEPLOY NFT CONTRACT ================
  console.log("\n1. Deploying FacesNFT...");
  const FacesNFT = await ethers.getContractFactory("contracts/01-SimpleNFT.sol:FacesNFT");
  
  console.log("  Waiting for deployment transaction signature on Ledger...");
  const facesNFT = await upgrades.deployProxy(FacesNFT, [], { 
    kind: "uups",
    initializer: "initialize"
  });
  await facesNFT.waitForDeployment();
  
  const nftAddress = await facesNFT.getAddress();
  console.log("  ✅ FacesNFT deployed to:", nftAddress);
  
  // Get implementation and admin addresses
  const nftImplementationAddress = await upgrades.erc1967.getImplementationAddress(nftAddress);
  console.log("  Implementation address:", nftImplementationAddress);
  
  // Save the deployed addresses
  saveAddresses(network.name, "01-nft", {
    proxy: nftAddress,
    implementation: nftImplementationAddress,
    admin: deployerAddress
  });
  
  // ================ 2. DEPLOY EXCHANGE SYSTEM ================
  console.log("\n2. Deploying Exchange system...");
  
  // Deploy Token contract
  console.log("  Deploying ExchangeVisageToken...");
  const ExchangeVisageToken = await ethers.getContractFactory("ExchangeVisageToken");
  console.log("  Waiting for token deployment transaction signature on Ledger...");
  const token = await upgrades.deployProxy(ExchangeVisageToken, [deployerAddress], { kind: "uups" });
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("  ✅ ExchangeVisageToken deployed to:", tokenAddress);

  // Deploy NFT for Exchange
  console.log("  Deploying ExchangeVisageNFT...");
  const ExchangeVisageNFT = await ethers.getContractFactory("ExchangeVisageNFT");
  console.log("  Waiting for NFT deployment transaction signature on Ledger...");
  const nft = await upgrades.deployProxy(ExchangeVisageNFT, [deployerAddress], { kind: "uups" });
  await nft.waitForDeployment();
  const nftExchangeAddress = await nft.getAddress();
  console.log("  ✅ ExchangeVisageNFT deployed to:", nftExchangeAddress);

  // Deploy Exchange
  console.log("  Deploying VisageExchange...");
  const VisageExchange = await ethers.getContractFactory("VisageExchange");
  console.log("  Waiting for exchange deployment transaction signature on Ledger...");
  const exchange = await upgrades.deployProxy(VisageExchange, [
    deployerAddress,
    tokenAddress,
    nftExchangeAddress
  ], { kind: "uups" });
  await exchange.waitForDeployment();
  const exchangeAddress = await exchange.getAddress();
  console.log("  ✅ VisageExchange deployed to:", exchangeAddress);

  // Transfer ownership of the NFT and token to the exchange
  console.log("  Transferring token ownership to exchange...");
  await token.transferOwnership(exchangeAddress);
  console.log("  Transferring NFT ownership to exchange...");
  await nft.transferOwnership(exchangeAddress);
  console.log("  ✅ Ownership transferred to exchange");

  // Save the deployed addresses
  saveAddresses(network.name, "02-exchange", {
    token: tokenAddress,
    nft: nftExchangeAddress,
    exchange: exchangeAddress,
    admin: deployerAddress
  });

  // ================ 3. DEPLOY STAKING SYSTEM ================
  console.log("\n3. Deploying Staking system...");
  
  // Deploy Staking Token contract
  console.log("  Deploying StakingVisageToken...");
  const StakingVisageToken = await ethers.getContractFactory("StakingVisageToken");
  console.log("  Waiting for staking token deployment transaction signature on Ledger...");
  const stakingToken = await upgrades.deployProxy(
    StakingVisageToken, 
    [deployerAddress], 
    { kind: "uups" }
  );
  await stakingToken.waitForDeployment();
  const stakingTokenAddress = await stakingToken.getAddress();
  console.log("  ✅ StakingVisageToken deployed to:", stakingTokenAddress);

  // Deploy Staking NFT contract
  console.log("  Deploying StakingVisageNFT...");
  const StakingVisageNFT = await ethers.getContractFactory("StakingVisageNFT");
  console.log("  Waiting for staking NFT deployment transaction signature on Ledger...");
  const stakingNFT = await upgrades.deployProxy(
    StakingVisageNFT, 
    [deployerAddress], 
    { kind: "uups" }
  );
  await stakingNFT.waitForDeployment();
  const stakingNFTAddress = await stakingNFT.getAddress();
  console.log("  ✅ StakingVisageNFT deployed to:", stakingNFTAddress);

  // Deploy Staking contract
  console.log("  Deploying VisageStaking...");
  const VisageStaking = await ethers.getContractFactory("VisageStaking");
  console.log("  Waiting for staking contract deployment transaction signature on Ledger...");
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
  console.log("  ✅ VisageStaking deployed to:", stakingAddress);

  // Transfer ownership of the NFT and token to the staking contract
  console.log("  Transferring staking token ownership to staking contract...");
  await stakingToken.transferOwnership(stakingAddress);
  console.log("  Transferring staking NFT ownership to staking contract...");
  await stakingNFT.transferOwnership(stakingAddress);
  console.log("  ✅ Ownership transferred to staking contract");

  // Save the deployed addresses
  saveAddresses(network.name, "03-staking", {
    token: stakingTokenAddress,
    nft: stakingNFTAddress,
    staking: stakingAddress,
    admin: deployerAddress
  });

  console.log("\n🎉 All contracts deployed to Sepolia successfully!");
  console.log("Check the .addresses.json file for all contract addresses.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 