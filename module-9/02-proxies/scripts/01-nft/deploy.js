const { ethers, upgrades, network } = require("hardhat");
const { saveAddresses } = require("../utils/addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying NFT contract with the account:", deployerAddress);
  console.log("Network:", network.name);

  // Deploy NFT contract
  console.log("Deploying FacesNFT...");
  const FacesNFT = await ethers.getContractFactory("contracts/01-SimpleNFT.sol:FacesNFT");
  
  // For UUPS proxies, the deployer is typically the admin by default
  const facesNFT = await upgrades.deployProxy(FacesNFT, [], { 
    kind: "uups",
    initializer: "initialize"
  });
  await facesNFT.waitForDeployment();
  
  const nftAddress = await facesNFT.getAddress();
  console.log("FacesNFT deployed to:", nftAddress);
  
  // Get implementation and admin addresses
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(nftAddress);
  
  // Hardhat's default first account
  let adminAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  if (network.name !== "localhost" && network.name !== "hardhat") {
    adminAddress = deployerAddress;
  }
  
  console.log("Implementation address:", implementationAddress);
  console.log("Admin address (with upgrade rights):", adminAddress);
  
  // Save the deployed addresses
  saveAddresses(network.name, "01-nft", {
    proxy: nftAddress,
    implementation: implementationAddress,
    admin: adminAddress
  });
  
  console.log("---------------");
  console.log("Deployment complete! Use this address when upgrading:", nftAddress);
  console.log("Addresses saved to .addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 