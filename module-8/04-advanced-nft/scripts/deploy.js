const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

async function main() {
  const whitelistAddresses = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
  ];

  // Create leaf nodes using proper encoding
  const leaves = whitelistAddresses.map((addr, index) =>
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [addr, index]
      )
    )
  );
  
  const merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();
  
  console.log("Deploying CommitReveal contracts...");
  
  // Deploy CommitRevealMapping contract
  const CommitRevealMapping = await ethers.getContractFactory("CommitRevealMapping");
  const mappingNFT = await CommitRevealMapping.deploy(
    "Mapping NFT",
    "MNFT",
    "https://whocaresbro.wtf/api/token/",
    root
  );
  
  await mappingNFT.deployed();
  console.log("CommitRevealMapping deployed to:", mappingNFT.address);
  
  // Deploy CommitRevealBitmap contract
  const CommitRevealBitmap = await ethers.getContractFactory("CommitRevealBitmap");
  const bitmapNFT = await CommitRevealBitmap.deploy(
    "Bitmap NFT",
    "BNFT",
    "https://whocaresbro.wtf/api/token/",
    root
  );
  
  await bitmapNFT.deployed();
  console.log("CommitRevealBitmap deployed to:", bitmapNFT.address);
  
  console.log("Merkle root:", root);
  
  // Set initial state to PrivateSale for both contracts
  await mappingNFT.setState(1); // PrivateSale
  console.log("Mapping NFT state set to PrivateSale");
  
  await bitmapNFT.setState(1); // PrivateSale
  console.log("Bitmap NFT state set to PrivateSale");
  
  // Generate example proof
  const firstAddr = whitelistAddresses[0];
  const firstIndex = 0;
  const leaf = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [firstAddr, firstIndex]
    )
  );
  const proof = merkleTree.getHexProof(leaf);
  
  console.log(`\nExample proof for address ${firstAddr}:`);
  console.log(`index: ${firstIndex}`);
  console.log(`proof: ${JSON.stringify(proof)}`);
  
  console.log("\nHow to use:");
  console.log("1. Generate a secret and create a commitment hash");
  console.log("2. Call commit(commitmentHash, index, proof) with payment (min 0.05 ETH)");
  console.log("3. Wait for the required number of blocks (10 blocks)");
  console.log("4. Call reveal(secret) to mint the NFT with a random token ID");
  
  console.log("\nContract deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 