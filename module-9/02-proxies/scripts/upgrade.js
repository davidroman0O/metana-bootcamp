const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading contract with the account:", await deployer.getAddress());

  // Get the proxy address - replace with the actual proxy address after deployment
  const proxyAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual proxy address
  
  console.log("Upgrading to FacesNFT V2 with god mode capability...");
  
  // Use the V2 contract with godModeTransfer function
  const FacesNFTv2 = await ethers.getContractFactory("contracts/01-SimpleNFT_V2.sol:FacesNFT");
  await upgrades.upgradeProxy(proxyAddress, FacesNFTv2);
  
  console.log("Upgrade complete! Contract now has god mode capability.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 