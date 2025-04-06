const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", await deployer.getAddress());

  // Deploy NFT contract
  console.log("Deploying FacesNFT...");
  const FacesNFT = await ethers.getContractFactory("contracts/01-SimpleNFT.sol:FacesNFT");
  const facesNFT = await upgrades.deployProxy(FacesNFT, [], { kind: "uups" });
  await facesNFT.waitForDeployment();
  console.log("FacesNFT deployed to:", await facesNFT.getAddress());

  // Deploy Token contract
  console.log("Deploying ExchangeVisageToken...");
  const ExchangeVisageToken = await ethers.getContractFactory("ExchangeVisageToken");
  const token = await upgrades.deployProxy(ExchangeVisageToken, [await deployer.getAddress()], { kind: "uups" });
  await token.waitForDeployment();
  console.log("ExchangeVisageToken deployed to:", await token.getAddress());

  // Deploy NFT for Exchange
  console.log("Deploying ExchangeVisageNFT...");
  const ExchangeVisageNFT = await ethers.getContractFactory("ExchangeVisageNFT");
  const nft = await upgrades.deployProxy(ExchangeVisageNFT, [await deployer.getAddress()], { kind: "uups" });
  await nft.waitForDeployment();
  console.log("ExchangeVisageNFT deployed to:", await nft.getAddress());

  // Deploy Exchange
  console.log("Deploying VisageExchange...");
  const VisageExchange = await ethers.getContractFactory("VisageExchange");
  const exchange = await upgrades.deployProxy(VisageExchange, [
    await deployer.getAddress(),
    await token.getAddress(),
    await nft.getAddress()
  ], { kind: "uups" });
  await exchange.waitForDeployment();
  console.log("VisageExchange deployed to:", await exchange.getAddress());

  // Transfer ownership of the NFT and token to the exchange
  await token.transferOwnership(await exchange.getAddress());
  await nft.transferOwnership(await exchange.getAddress());
  console.log("Ownership transferred to exchange");

  // Deploy Staking Token contract
  console.log("Deploying StakingVisageToken...");
  const StakingVisageToken = await ethers.getContractFactory("StakingVisageToken");
  const stakingToken = await upgrades.deployProxy(StakingVisageToken, [await deployer.getAddress()], { kind: "uups" });
  await stakingToken.waitForDeployment();
  console.log("StakingVisageToken deployed to:", await stakingToken.getAddress());

  // Deploy Staking NFT contract
  console.log("Deploying StakingVisageNFT...");
  const StakingVisageNFT = await ethers.getContractFactory("StakingVisageNFT");
  const stakingNFT = await upgrades.deployProxy(StakingVisageNFT, [await deployer.getAddress()], { kind: "uups" });
  await stakingNFT.waitForDeployment();
  console.log("StakingVisageNFT deployed to:", await stakingNFT.getAddress());

  // Deploy Staking contract
  console.log("Deploying VisageStaking...");
  const VisageStaking = await ethers.getContractFactory("VisageStaking");
  const staking = await upgrades.deployProxy(VisageStaking, [
    await deployer.getAddress(),
    await stakingToken.getAddress(),
    await stakingNFT.getAddress()
  ], { kind: "uups" });
  await staking.waitForDeployment();
  console.log("VisageStaking deployed to:", await staking.getAddress());

  // Transfer ownership of the NFT and token to the staking contract
  await stakingToken.transferOwnership(await staking.getAddress());
  await stakingNFT.transferOwnership(await staking.getAddress());
  console.log("Ownership transferred to staking contract");

  console.log("All contracts deployed and configured successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 