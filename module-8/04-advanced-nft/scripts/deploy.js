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

  const leaves = whitelistAddresses.map((addr, index) =>
    ethers.utils.solidityKeccak256(["address", "uint256"], [addr, index])
  );
  
  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();
  
  console.log("Deploying Advanced NFT contract...");
  
  const AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
  
  const advancedNFT = await AdvancedNFT.deploy(
    "Advanced NFT",
    "ANFT",
    "https://whocares.wtf/api/token/"
  );
  
  await advancedNFT.deployed();
  
  console.log("AdvancedNFT deployed to:", advancedNFT.address);
  
  await advancedNFT.setMerkleRoot(root);
  console.log("Merkle root set to:", root);
  
  const firstAddr = whitelistAddresses[0];
  const firstIndex = 0;
  const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], [firstAddr, firstIndex]);
  const proof = merkleTree.getHexProof(leaf);
  
  console.log(`\nExample proof for address ${firstAddr}:`);
  console.log(`index: ${firstIndex}`);
  console.log(`proof: ${JSON.stringify(proof)}`);
  
  console.log("\nContract deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 