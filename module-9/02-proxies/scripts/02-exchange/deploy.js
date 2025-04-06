const { ethers, upgrades, network } = require("hardhat");
const { saveAddresses } = require("../utils/addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying Exchange contracts with the account:", deployerAddress);

  // Deploy Token contract
  console.log("Deploying ExchangeVisageToken...");
  const ExchangeVisageToken = await ethers.getContractFactory("ExchangeVisageToken");
  const token = await upgrades.deployProxy(ExchangeVisageToken, [deployerAddress], { kind: "uups" });
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("ExchangeVisageToken deployed to:", tokenAddress);

  // Deploy NFT for Exchange
  console.log("Deploying ExchangeVisageNFT...");
  const ExchangeVisageNFT = await ethers.getContractFactory("ExchangeVisageNFT");
  const nft = await upgrades.deployProxy(ExchangeVisageNFT, [deployerAddress], { kind: "uups" });
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("ExchangeVisageNFT deployed to:", nftAddress);

  // Deploy Exchange
  console.log("Deploying VisageExchange...");
  const VisageExchange = await ethers.getContractFactory("VisageExchange");
  const exchange = await upgrades.deployProxy(VisageExchange, [
    deployerAddress,
    tokenAddress,
    nftAddress
  ], { kind: "uups" });
  await exchange.waitForDeployment();
  const exchangeAddress = await exchange.getAddress();
  console.log("VisageExchange deployed to:", exchangeAddress);

  // Transfer ownership of the NFT and token to the exchange
  await token.transferOwnership(exchangeAddress);
  await nft.transferOwnership(exchangeAddress);
  console.log("Ownership transferred to exchange");

  // Save the deployed addresses
  saveAddresses(network.name, "02-exchange", {
    token: tokenAddress,
    nft: nftAddress,
    exchange: exchangeAddress,
    admin: deployerAddress
  });

  console.log("---------------");
  console.log("Deployment complete! Contract addresses:");
  console.log("Token:", tokenAddress);
  console.log("NFT:", nftAddress);
  console.log("Exchange:", exchangeAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 