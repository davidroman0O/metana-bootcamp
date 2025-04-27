const { ethers, network } = require("hardhat");
const { getAddresses } = require("../utils/addresses");
require('dotenv').config();

async function main() {
  console.log("Testing if godModeTransfer function works on the NFT proxy");
  console.log("Network:", network.name);

  // Get the signer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Testing with account:", deployerAddress);

  // Get the NFT proxy address
  const nftAddresses = getAddresses(network.name, "nft") || {};
  
  if (!nftAddresses.proxy) {
    console.error("No NFT proxy address found in the addresses file.");
    process.exit(1);
  }

  const nftProxyAddress = nftAddresses.proxy;
  console.log("\nNFT proxy address:", nftProxyAddress);

  try {
    // Attach to the NFT contract via the proxy with the V2 interface
    console.log("Attaching to NFT contract with V2 interface...");
    const nftContract = await ethers.getContractAt("contracts/01-SimpleNFT_V2.sol:FacesNFT", nftProxyAddress);

    // First, mint an NFT to test with
    console.log("\nMinting an NFT to test with...");
    const mintTx = await nftContract.mint();
    await mintTx.wait();
    console.log("NFT minted successfully!");

    // Check current token ID
    const currentTokenId = await nftContract.currentTokenId();
    console.log("Current token ID:", currentTokenId);
    
    // Get the token ID of the NFT we just minted
    const tokenId = currentTokenId;
    
    // Check owner of the token
    const originalOwner = await nftContract.ownerOf(tokenId);
    console.log(`Token ${tokenId} is owned by: ${originalOwner}`);
    
    // Create a recipient address - we'll use the second account or a random address
    let recipientAddress;
    try {
      // Try to get a second signer if available
      const signers = await ethers.getSigners();
      recipientAddress = await signers[1].getAddress();
    } catch (error) {
      // If no second signer, generate a random address
      const randomWallet = ethers.Wallet.createRandom();
      recipientAddress = randomWallet.address;
    }
    
    console.log(`\nAttempting to transfer token ${tokenId} from ${originalOwner} to ${recipientAddress} using godModeTransfer...`);
    
    // Call godModeTransfer function (this will fail if the function doesn't exist or the upgrade didn't work)
    try {
      const transferTx = await nftContract.godModeTransfer(originalOwner, recipientAddress, tokenId);
      await transferTx.wait();
      console.log("✅ godModeTransfer transaction successful!");
      
      // Verify the token transferred correctly
      const newOwner = await nftContract.ownerOf(tokenId);
      console.log(`Token ${tokenId} is now owned by: ${newOwner}`);
      
      if (newOwner.toLowerCase() === recipientAddress.toLowerCase()) {
        console.log("\n✅ SUCCESS: godModeTransfer function is working correctly!");
        console.log("This confirms that the V2 upgrade was successful, even though the implementation address didn't change.");
      } else {
        console.log("\n❌ ERROR: Token didn't transfer to the expected recipient.");
        console.log("This suggests a problem with the godModeTransfer function.");
      }
    } catch (error) {
      console.error("\n❌ ERROR: Failed to execute godModeTransfer function:", error.message);
      console.log("This suggests the upgrade did not properly implement the V2 functionality.");
    }
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    
    // Check if the error suggests the function doesn't exist
    if (error.message.includes("not a function") || error.message.includes("no method named") || error.message.includes("unknown function")) {
      console.log("The godModeTransfer function does not exist on this contract.");
      console.log("This confirms that the V2 upgrade did NOT actually add the function.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 