const { ethers, upgrades, network } = require("hardhat");
const { saveAddresses } = require("../utils/addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying Staking contracts with the account:", deployerAddress);

  // Deploy Staking Token contract
  console.log("Deploying StakingVisageToken...");
  const StakingVisageToken = await ethers.getContractFactory("StakingVisageToken");
  const stakingToken = await upgrades.deployProxy(
    StakingVisageToken, 
    [deployerAddress], 
    { kind: "uups" }
  );
  await stakingToken.waitForDeployment();
  const tokenAddress = await stakingToken.getAddress();
  console.log("StakingVisageToken deployed to:", tokenAddress);

  // Deploy Staking NFT contract
  console.log("Deploying StakingVisageNFT...");
  const StakingVisageNFT = await ethers.getContractFactory("StakingVisageNFT");
  const stakingNFT = await upgrades.deployProxy(
    StakingVisageNFT, 
    [deployerAddress], 
    { kind: "uups" }
  );
  await stakingNFT.waitForDeployment();
  const nftAddress = await stakingNFT.getAddress();
  console.log("StakingVisageNFT deployed to:", nftAddress);

  // Deploy Staking contract
  console.log("Deploying VisageStaking...");
  const VisageStaking = await ethers.getContractFactory("VisageStaking");
  const staking = await upgrades.deployProxy(
    VisageStaking, 
    [
      deployerAddress,
      tokenAddress,
      nftAddress
    ], 
    { kind: "uups" }
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("VisageStaking deployed to:", stakingAddress);

  // Transfer ownership of the NFT and token to the staking contract
  await stakingToken.transferOwnership(stakingAddress);
  await stakingNFT.transferOwnership(stakingAddress);
  console.log("Ownership transferred to staking contract");

  // Save the deployed addresses
  saveAddresses(network.name, "03-staking", {
    token: tokenAddress,
    nft: nftAddress,
    staking: stakingAddress,
    admin: deployerAddress
  });

  console.log("---------------");
  console.log("Deployment complete! Contract addresses:");
  console.log("Staking Token:", tokenAddress);
  console.log("Staking NFT:", nftAddress);
  console.log("Staking Contract:", stakingAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 