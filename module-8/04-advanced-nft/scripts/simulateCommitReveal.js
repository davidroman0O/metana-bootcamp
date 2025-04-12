const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const fs = require('fs');

async function main() {
  console.log("Simulating Merkle Tree and Commit-Reveal for NFT contracts...");
  
  const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
  
  // Whitelist addresses for testing
  const whitelistAddresses = [
    { address: owner.address, index: 0 },
    { address: user1.address, index: 1 },
    { address: user2.address, index: 2 },
    { address: user3.address, index: 3 },
    { address: user4.address, index: 4 },
    { address: user5.address, index: 5 }
  ];
  
  console.log("Generating Merkle Tree...");
  
  // Create leaf nodes using proper encoding
  const leaves = whitelistAddresses.map(entry => {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [entry.address, entry.index]
      )
    );
  });
  
  // Create Merkle tree
  const merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, { sortPairs: true });
  const merkleRoot = merkleTree.getHexRoot();
  console.log("Merkle Root:", merkleRoot);
  
  // Save Merkle tree data to a file
  const merkleData = {
    root: merkleRoot,
    addresses: whitelistAddresses.map(entry => ({
      address: entry.address,
      index: entry.index,
      leaf: ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [entry.address, entry.index]
        )
      ),
      proof: merkleTree.getHexProof(ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [entry.address, entry.index]
        )
      ))
    }))
  };
  
  fs.writeFileSync(
    'merkle-tree-data-commit-reveal.json',
    JSON.stringify(merkleData, null, 2)
  );
  
  console.log("Merkle tree data saved to 'merkle-tree-data-commit-reveal.json'");
  
  // Deploy both contract types for simulation
  console.log("\nDeploying test contracts...");
  
  // Deploy Mapping-based contract
  const CommitRevealMapping = await ethers.getContractFactory("CommitRevealMapping");
  const mappingNFT = await CommitRevealMapping.deploy(
    "Mapping NFT",
    "MNFT",
    "https://whocaresbro.wtf/api/token/",
    merkleRoot
  );
  await mappingNFT.deployed();
  console.log("CommitRevealMapping deployed to:", mappingNFT.address);
  
  // Set initial state to PrivateSale
  await mappingNFT.setState(1); // PrivateSale
  console.log("Mapping NFT state set to PrivateSale");
  
  // Deploy Bitmap-based contract for comparison
  const CommitRevealBitmap = await ethers.getContractFactory("CommitRevealBitmap");
  const bitmapNFT = await CommitRevealBitmap.deploy(
    "Bitmap NFT",
    "BNFT",
    "https://whocaresbro.wtf/api/token/",
    merkleRoot
  );
  await bitmapNFT.deployed();
  console.log("CommitRevealBitmap deployed to:", bitmapNFT.address);
  await bitmapNFT.setState(1); // PrivateSale
  console.log("Bitmap NFT state set to PrivateSale");
  
  // Simulate the commit-reveal flow
  console.log("\n=== SIMULATING COMMIT-REVEAL WITH MAPPING CONTRACT ===");
  
  // Get proof for user1
  const user1Entry = merkleData.addresses.find(a => a.address === user1.address);
  const user1Proof = user1Entry.proof;
  
  // Create a secret and commitment
  const secret = "my-secret-123";
  const secretBytes = ethers.utils.formatBytes32String(secret);
  const commitment = ethers.utils.solidityKeccak256(
    ["address", "bytes32"],
    [user1.address, secretBytes]
  );
  
  console.log(`\nUser address: ${user1.address}`);
  console.log(`Secret: ${secret}`);
  console.log(`Commitment: ${commitment}`);
  
  // Submit the commitment
  console.log("\nSubmitting commitment...");
  await mappingNFT.connect(user1).commit(commitment, user1Entry.index, user1Proof, {
    value: ethers.utils.parseEther("0.05")
  });
  console.log("Commitment submitted");
  
  // Get the block number of the commitment
  const commitmentData = await mappingNFT.commitments(user1.address);
  console.log(`Commitment stored at block: ${commitmentData.block}`);
  
  // Mine blocks to pass the waiting period
  const blocksToMine = await mappingNFT.BLOCKS_FOR_REVEAL();
  console.log(`\nMining ${blocksToMine} blocks...`);
  for (let i = 0; i < blocksToMine; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  
  // Reveal the commitment
  console.log("\nRevealing commitment...");
  const revealTx = await mappingNFT.connect(user1).reveal(secretBytes);
  const revealReceipt = await revealTx.wait();
  
  // Find the TokenMinted event
  const tokenMintedEvent = revealReceipt.events.find(e => e.event === "TokenMinted");
  if (tokenMintedEvent) {
    const tokenId = tokenMintedEvent.args.tokenId.toString();
    console.log(`Token minted with ID: ${tokenId}`);
    
    // Get the token URI
    const tokenURI = await mappingNFT.tokenURI(tokenId);
    console.log(`Token URI: ${tokenURI}`);
  }
  
  console.log("\n=== DEMONSTRATING WITH MULTIPLE USERS ===");
  
  // Demonstrate with multiple users (user2-user5) - using 5 users total like in compareGasCosts.js
  const testUsers = [user2, user3, user4, user5];
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    const userEntry = merkleData.addresses.find(a => a.address === user.address);
    const userProof = userEntry.proof;
    
    // Create unique secret for each user
    const userSecret = `secret-for-user-${i+2}`;
    const userSecretBytes = ethers.utils.formatBytes32String(userSecret);
    const userCommitment = ethers.utils.solidityKeccak256(
      ["address", "bytes32"],
      [user.address, userSecretBytes]
    );
    
    console.log(`\nUser ${i+2} address: ${user.address}`);
    console.log(`Secret: ${userSecret}`);
    
    // Submit commitment for bitmap contract
    await bitmapNFT.connect(user).commit(userCommitment, userEntry.index, userProof, {
      value: ethers.utils.parseEther("0.05")
    });
    console.log(`User ${i+2} commitment submitted to bitmap contract`);
  }
  
  // Mine blocks again
  console.log(`\nMining ${blocksToMine} more blocks...`);
  for (let i = 0; i < blocksToMine; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  
  // Reveal for all users on bitmap contract
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    const userSecret = `secret-for-user-${i+2}`;
    const userSecretBytes = ethers.utils.formatBytes32String(userSecret);
    
    const revealTx = await bitmapNFT.connect(user).reveal(userSecretBytes);
    const revealReceipt = await revealTx.wait();
    
    const tokenEvent = revealReceipt.events.find(e => e.event === "TokenMinted");
    if (tokenEvent) {
      const tokenId = tokenEvent.args.tokenId.toString();
      console.log(`User ${i+2} minted token with ID: ${tokenId} in bitmap contract`);
    }
  }
  
  console.log("\nSimulation complete!");
  
  // Print example for using the contracts
  console.log("\n=== HOW TO USE ===");
  console.log("1. Deploy either CommitRevealMapping or CommitRevealBitmap with the Merkle root");
  console.log("2. For each whitelisted address:");
  console.log("   a. Use the address's index and Merkle proof from merkle-tree-data.json");
  console.log("   b. Generate a secret and create a commitment hash");
  console.log("   c. Call commit(commitmentHash, index, proof) with payment (min 0.05 ETH)");
  console.log("   d. Wait for the required number of blocks (10 blocks)");
  console.log("   e. Call reveal(secret) to mint the NFT with a random token ID");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 