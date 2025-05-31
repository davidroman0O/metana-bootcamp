const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

async function main() {
  console.log("Deploying CommitRevealMapping and CommitRevealBitmap contracts...");
  
  const [deployer, user1, user2] = await ethers.getSigners();
  
  // Create whitelist addresses and merkle tree
  const whitelistAddresses = [
    user1.address,
    user2.address,
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  ];
  
  const leaves = whitelistAddresses.map((addr, index) =>
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [addr, index]
      )
    )
  );
  
  const merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, { sortPairs: true });
  const merkleRoot = merkleTree.getHexRoot();
  
  console.log("Generated Merkle Root:", merkleRoot);
  
  // Deploy mapping-based contract
  const CommitRevealMapping = await ethers.getContractFactory("CommitRevealMapping");
  const mappingNFT = await CommitRevealMapping.deploy(
    "Mapping NFT",
    "MNFT",
    "https://whocaresbro.wtf/api/token/",
    merkleRoot
  );
  
  await mappingNFT.deployed();
  console.log("CommitRevealMapping deployed to:", mappingNFT.address);
  
  // Deploy bitmap-based contract
  const CommitRevealBitmap = await ethers.getContractFactory("CommitRevealBitmap");
  const bitmapNFT = await CommitRevealBitmap.deploy(
    "Bitmap NFT",
    "BNFT",
    "https://whocaresbro.wtf/api/token/",
    merkleRoot
  );
  
  await bitmapNFT.deployed();
  console.log("CommitRevealBitmap deployed to:", bitmapNFT.address);
  
  // Set initial state to PrivateSale for both contracts
  await mappingNFT.setState(1); // PrivateSale
  console.log("Mapping NFT state set to PrivateSale");
  
  await bitmapNFT.setState(1); // PrivateSale
  console.log("Bitmap NFT state set to PrivateSale");
  
  // Print example proof for the first address
  const firstAddr = whitelistAddresses[0];
  const firstIndex = 0;
  const leaf = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [firstAddr, firstIndex]
    )
  );
  const proof = merkleTree.getHexProof(leaf);
  
  console.log("\nExample proof for address", firstAddr);
  console.log("Index:", firstIndex);
  console.log("Proof:", JSON.stringify(proof));
  
  console.log("\nExample commit-reveal process:");
  console.log("1. Generate a secret like 'mysecret123'");
  console.log("2. Hash it with your address: keccak256(abi.encodePacked(address, bytes32('mysecret123')))");
  console.log("3. Call commit() with the hash, index and merkle proof");
  console.log("4. Wait for the required number of blocks");
  console.log("5. Call reveal() with your original secret");
  
  console.log("\nExample commit-reveal process:");
  console.log("1. Generate a secret like 'mysecret123'");
  console.log("2. Hash it with your address: keccak256(abi.encodePacked(address, bytes32('mysecret123')))");
  console.log("3. Call commit() with the hash, index, merkle proof and payment (minimum 0.05 ETH)");
  console.log("4. Wait for the required number of blocks (10 blocks)");
  console.log("5. Call reveal() with your original secret to mint your NFT with a random token ID");
  
  console.log("\nContract deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 