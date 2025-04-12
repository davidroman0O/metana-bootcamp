const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

async function main() {
  console.log("Comparing gas costs between CommitRevealMapping and CommitRevealBitmap...");
  
  const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
  
  // Create whitelist addresses and merkle tree
  const whitelistAddresses = [
    user1.address,
    user2.address,
    user3.address,
    user4.address,
    user5.address
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
  await bitmapNFT.setState(1); // PrivateSale
  console.log("Both contracts set to PrivateSale state");
  
  // Helper function to generate commitment
  function generateCommitment(user, secret) {
    const secretBytes = ethers.utils.formatBytes32String(secret);
    return ethers.utils.solidityKeccak256(
      ["address", "bytes32"],
      [user.address, secretBytes]
    );
  }
  
  // Helper function to get merkle proof
  function getMerkleProof(user, index) {
    const leaf = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user.address, index]
      )
    );
    return merkleTree.getHexProof(leaf);
  }
  
  // Gas used tracking
  const gasUsed = {
    mapping: {
      commit: [],
      reveal: []
    },
    bitmap: {
      commit: [],
      reveal: []
    }
  };
  
  // Test with 5 users like in compareGasCosts.js
  const users = [user1, user2, user3, user4, user5];
  const secrets = ["secret1", "secret2", "secret3", "secret4", "secret5"];
  
  console.log("\n=== COMMIT TRANSACTIONS ===");
  
  // Commit phase
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const secret = secrets[i];
    const commitment = generateCommitment(user, secret);
    const proof = getMerkleProof(user, i);
    
    // Mapping contract
    const mappingTx = await mappingNFT.connect(user).commit(commitment, i, proof, {
      value: ethers.utils.parseEther("0.05")
    });
    const mappingReceipt = await mappingTx.wait();
    gasUsed.mapping.commit.push(mappingReceipt.gasUsed.toNumber());
    
    // Bitmap contract
    const bitmapTx = await bitmapNFT.connect(user).commit(commitment, i, proof, {
      value: ethers.utils.parseEther("0.05")
    });
    const bitmapReceipt = await bitmapTx.wait();
    gasUsed.bitmap.commit.push(bitmapReceipt.gasUsed.toNumber());
    
    console.log(`User ${i+1} commit - Mapping gas: ${mappingReceipt.gasUsed}, Bitmap gas: ${bitmapReceipt.gasUsed}`);
  }
  
  // Mine blocks to pass the required waiting period
  for (let i = 0; i < 10; i++) {
    await ethers.provider.send("evm_mine");
  }
  
  console.log("\n=== REVEAL TRANSACTIONS ===");
  
  // Reveal phase
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const secret = secrets[i];
    const secretBytes = ethers.utils.formatBytes32String(secret);
    
    // Mapping contract
    const mappingTx = await mappingNFT.connect(user).reveal(secretBytes);
    const mappingReceipt = await mappingTx.wait();
    gasUsed.mapping.reveal.push(mappingReceipt.gasUsed.toNumber());
    
    // Bitmap contract
    const bitmapTx = await bitmapNFT.connect(user).reveal(secretBytes);
    const bitmapReceipt = await bitmapTx.wait();
    gasUsed.bitmap.reveal.push(bitmapReceipt.gasUsed.toNumber());
    
    console.log(`User ${i+1} reveal - Mapping gas: ${mappingReceipt.gasUsed}, Bitmap gas: ${bitmapReceipt.gasUsed}`);
  }
  
  // Calculate averages
  const avgMappingCommit = gasUsed.mapping.commit.length > 0 ? 
    gasUsed.mapping.commit.reduce((a, b) => a + b, 0) / gasUsed.mapping.commit.length : 0;
  const avgBitmapCommit = gasUsed.bitmap.commit.length > 0 ? 
    gasUsed.bitmap.commit.reduce((a, b) => a + b, 0) / gasUsed.bitmap.commit.length : 0;
  const avgMappingReveal = gasUsed.mapping.reveal.length > 0 ? 
    gasUsed.mapping.reveal.reduce((a, b) => a + b, 0) / gasUsed.mapping.reveal.length : 0;
  const avgBitmapReveal = gasUsed.bitmap.reveal.length > 0 ? 
    gasUsed.bitmap.reveal.reduce((a, b) => a + b, 0) / gasUsed.bitmap.reveal.length : 0;
  
  console.log("\n=== SUMMARY ===");
  console.log(`Average Commit Gas - Mapping: ${avgMappingCommit}, Bitmap: ${avgBitmapCommit}`);
  console.log(`Average Reveal Gas - Mapping: ${avgMappingReveal}, Bitmap: ${avgBitmapReveal}`);
  console.log(`Commit Difference: ${avgMappingCommit - avgBitmapCommit} (${((avgMappingCommit - avgBitmapCommit) / avgMappingCommit * 100).toFixed(2)}%)`);
  console.log(`Reveal Difference: ${avgMappingReveal - avgBitmapReveal} (${((avgMappingReveal - avgBitmapReveal) / avgMappingReveal * 100).toFixed(2)}%)`);
  
  // Print token IDs
  console.log("\n=== ASSIGNED TOKEN IDs ===");
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const mappingTokenId = await mappingNFT.tokenOfOwnerByIndex(user.address, 0);
    const bitmapTokenId = await bitmapNFT.tokenOfOwnerByIndex(user.address, 0);
    
    console.log(`User ${i+1} - Mapping TokenID: ${mappingTokenId}, Bitmap TokenID: ${bitmapTokenId}`);
  }
  
  // Add similar scaling analysis as in compareGasCosts.js
  console.log("\n=== GAS COST SCALING ANALYSIS ===");
  console.log("Commit Gas Costs by User:");
  for (let i = 0; i < users.length; i++) {
    console.log(`User ${i+1} - Mapping: ${gasUsed.mapping.commit[i]}, Bitmap: ${gasUsed.bitmap.commit[i]}`);
  }
  
  console.log("\nReveal Gas Costs by User:");
  for (let i = 0; i < users.length; i++) {
    console.log(`User ${i+1} - Mapping: ${gasUsed.mapping.reveal[i]}, Bitmap: ${gasUsed.bitmap.reveal[i]}`);
  }
  
  console.log("\nConclusion:");
  if (avgBitmapCommit < avgMappingCommit) {
    console.log(`The bitmap implementation is more gas efficient for commits by ${(avgMappingCommit - avgBitmapCommit).toFixed(2)} gas on average.`);
  } else {
    console.log(`The mapping implementation is more gas efficient for commits by ${(avgBitmapCommit - avgMappingCommit).toFixed(2)} gas on average.`);
  }
  
  if (avgBitmapReveal < avgMappingReveal) {
    console.log(`The bitmap implementation is more gas efficient for reveals by ${(avgMappingReveal - avgBitmapReveal).toFixed(2)} gas on average.`);
  } else {
    console.log(`The mapping implementation is more gas efficient for reveals by ${(avgBitmapReveal - avgMappingReveal).toFixed(2)} gas on average.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 