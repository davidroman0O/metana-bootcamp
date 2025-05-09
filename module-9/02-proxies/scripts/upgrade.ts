const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading contract with the account:", await deployer.getAddress());

  // Get the proxy address - replace with the actual proxy address after deployment
  const proxyAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual proxy address
  
  console.log("Upgrading FacesNFT to V2...");
  
  // Deploy the V2 implementation
  const FacesNFTv2 = await ethers.getContractFactory("FacesNFT");
  
  // Upgrade to the new implementation
  await upgrades.upgradeProxy(proxyAddress, FacesNFTv2);
  
  console.log("FacesNFT upgraded to V2 with god mode capability!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 