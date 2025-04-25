const { ethers, upgrades, network } = require("hardhat");
const { getAddresses, saveAddresses } = require("./utils/addresses");

async function main() {
  console.log("Upgrading NFT contract using Ledger wallet");
  console.log("Network:", network.name);
  
  // Get the signer from the Ledger account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Upgrading with the Ledger account:", deployerAddress);

  // Reminder for the user
  console.log("\n⚠️ IMPORTANT: Please ensure your Ledger device is:");
  console.log("  1. Connected via USB");
  console.log("  2. Unlocked");
  console.log("  3. Ethereum app is open");
  console.log("  4. Contract data is allowed in the Ethereum app settings\n");

  // Get the saved proxy address
  const addresses = getAddresses(network.name, "01-nft");
  
  if (!addresses || !addresses.proxy) {
    console.error("No proxy address found. Please deploy the contract first.");
    process.exit(1);
  }
  
  const proxyAddress = addresses.proxy;
  console.log("Using existing proxy address:", proxyAddress);
  
  // Use the V2 contract with godModeTransfer function
  console.log("Preparing upgrade to FacesNFT V2 with god mode capability...");
  const FacesNFTv2 = await ethers.getContractFactory("contracts/01-SimpleNFT_V2.sol:FacesNFT");
  
  console.log("Waiting for upgrade transaction signature on Ledger...");
  const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, FacesNFTv2);
  await upgradedProxy.waitForDeployment();
  
  // Save the new implementation address
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  saveAddresses(network.name, "01-nft", {
    proxy: proxyAddress,
    implementationV2: newImplementationAddress,
    admin: deployerAddress
  });
  
  console.log("✅ Upgrade complete! Contract now has god mode capability.");
  console.log("New implementation address:", newImplementationAddress);
  console.log("Addresses saved to .addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 