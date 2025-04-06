const { ethers, upgrades, network } = require("hardhat");
const { getAddresses, saveAddresses } = require("../utils/addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading NFT contract with the account:", await deployer.getAddress());
  console.log("Network:", network.name);

  // Get the saved proxy address
  const addresses = getAddresses(network.name, "01-nft");
  
  if (!addresses.proxy) {
    console.error("No proxy address found. Please deploy the contract first or provide a proxy address.");
    process.exit(1);
  }
  
  const proxyAddress = addresses.proxy;
  console.log("Using proxy address:", proxyAddress);
  
  console.log("Upgrading to FacesNFT V2 with god mode capability...");
  
  // Use the V2 contract with godModeTransfer function
  const FacesNFTv2 = await ethers.getContractFactory("contracts/01-SimpleNFT_V2.sol:FacesNFT");
  const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, FacesNFTv2);
  await upgradedProxy.waitForDeployment();
  
  // Save the new implementation address
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  saveAddresses(network.name, "01-nft", {
    proxy: proxyAddress,
    implementationV2: newImplementationAddress
  });
  
  console.log("Upgrade complete! Contract now has god mode capability.");
  console.log("New implementation address:", newImplementationAddress);
  console.log("Addresses saved to .addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

