const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { ethers } = require('hardhat');
const fs = require('fs');

// List of whitelisted addresses with explicit index assignments
const whitelistAddresses = [
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", index: 0 },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", index: 1 },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", index: 2 },
  { address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", index: 3 },
  { address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", index: 4 },
  { address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9", index: 5 },
  { address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", index: 6 },
  { address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", index: 7 },
  { address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", index: 8 },
  { address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096", index: 9 }
];

async function main() {
  console.log("Generating Merkle Tree with Address-Index Pairs\n");
  
  // Display all address-index pairs
  console.log("Address-Index Mappings:");
  console.log("=======================");
  whitelistAddresses.forEach(entry => {
    console.log(`Index ${entry.index}: ${entry.address}`);
  });
  console.log("");
  
  // Create leaf nodes by hashing address and index pairs
  const leaves = whitelistAddresses.map(entry => {
    const leaf = ethers.utils.solidityKeccak256(
      ["address", "uint256"],
      [entry.address, entry.index]
    );
    return leaf;
  });
  
  // Create and sort the Merkle tree
  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();
  
  console.log("Merkle Tree Information:");
  console.log("======================");
  console.log(`Merkle Root: ${root}`);
  console.log(`Total Leaves: ${leaves.length}`);
  console.log("");
  
  // Generate and display proof for each address
  console.log("Merkle Proofs for Each Address:");
  console.log("==============================");
  whitelistAddresses.forEach(entry => {
    const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], [entry.address, entry.index]);
    const proof = merkleTree.getHexProof(leaf);
    
    console.log(`Address #${entry.index}: ${entry.address}`);
    console.log(`Proof: ${JSON.stringify(proof)}`);
    console.log(`Leaf: ${leaf}`);
    console.log(`Verification: ${merkleTree.verify(proof, leaf, root)}`);
    console.log("");
  });
  
  // Save the data to a JSON file for later use
  const merkleData = {
    root: root,
    addresses: whitelistAddresses.map(entry => ({
      address: entry.address,
      index: entry.index,
      leaf: ethers.utils.solidityKeccak256(["address", "uint256"], [entry.address, entry.index]),
      proof: merkleTree.getHexProof(ethers.utils.solidityKeccak256(["address", "uint256"], [entry.address, entry.index]))
    }))
  };
  
  fs.writeFileSync(
    'merkle-tree-data.json',
    JSON.stringify(merkleData, null, 2)
  );
  
  console.log("Merkle tree data saved to 'merkle-tree-data.json'");
  console.log("\nHow to Use This Data:");
  console.log("1. The Merkle Root should be set in the AdvancedNFT contract constructor");
  console.log("2. For each address to claim their tokens:");
  console.log("   - Use their assigned index from the mapping");
  console.log("   - Use the proof provided for their address");
  console.log("   - Call claimWithBitmap(index, proof) or claimWithMapping(index, proof)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 