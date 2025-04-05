const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

async function main() {
  console.log("Measuring gas costs between bitmap and mapping implementations...");
  
  const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
  
  const whitelistAddresses = [
    user1.address,
    user2.address,
    user3.address,
    user4.address,
    user5.address
  ];
  
  const leaves = whitelistAddresses.map((addr, index) =>
    ethers.utils.solidityKeccak256(["address", "uint256"], [addr, index])
  );
  
  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();
  
  const AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
  
  console.log("Deploying first contract for bitmap testing...");
  const bitmapContract = await AdvancedNFT.deploy(
    "Bitmap NFT",
    "BNFT",
    "https://whocaresbro.wtf/api/token/",
    root
  );
  await bitmapContract.deployed();
  
  console.log("Deploying second contract for mapping testing...");
  const mappingContract = await AdvancedNFT.deploy(
    "Mapping NFT",
    "MNFT",
    "https://whocaresbro.wtf/api/token/",
    root
  );
  await mappingContract.deployed();
  
  await bitmapContract.setState(1); // Set to PrivateSale
  await mappingContract.setState(1); // Set to PrivateSale
  
  console.log("\nMeasuring gas for first-time mints:");
  
  const bitmapResults = [];
  for (let i = 0; i < whitelistAddresses.length; i++) {
    const user = await ethers.getSigner(whitelistAddresses[i]);
    const proof = merkleTree.getHexProof(leaves[i]);
    
    const tx = await bitmapContract.connect(user).claimWithBitmap(
      i,
      proof
    );
    
    const receipt = await tx.wait();
    bitmapResults.push(receipt.gasUsed);
    
    console.log(`Bitmap mint for user ${i}: ${receipt.gasUsed.toString()} gas used`);
  }
  
  const mappingResults = [];
  for (let i = 0; i < whitelistAddresses.length; i++) {
    const user = await ethers.getSigner(whitelistAddresses[i]);
    const proof = merkleTree.getHexProof(leaves[i]);
    
    const tx = await mappingContract.connect(user).claimWithMapping(
      i,
      proof
    );
    
    const receipt = await tx.wait();
    mappingResults.push(receipt.gasUsed);
    
    console.log(`Mapping mint for user ${i}: ${receipt.gasUsed.toString()} gas used`);
  }
  
  const bitmapAvg = bitmapResults.reduce((a, b) => a.add(b), ethers.BigNumber.from(0)).div(bitmapResults.length);
  const mappingAvg = mappingResults.reduce((a, b) => a.add(b), ethers.BigNumber.from(0)).div(mappingResults.length);
  
  console.log("\nGas Cost Comparison:");
  console.log(`Bitmap average: ${bitmapAvg.toString()} gas`);
  console.log(`Mapping average: ${mappingAvg.toString()} gas`);
  console.log(`Difference: ${mappingAvg.sub(bitmapAvg).toString()} gas`);
  console.log(`Percentage savings: ${mappingAvg.sub(bitmapAvg).mul(100).div(mappingAvg)}%`);
  
  console.log("\nMeasuring gas costs as more addresses are added:");
  
  const multiContract = await AdvancedNFT.deploy(
    "Multi NFT",
    "MNFT",
    "https://whocaresbro.wtf/api/token/",
    root
  );
  await multiContract.deployed();
  
  await multiContract.setState(1); // Set to PrivateSale
  
  const bitmapScaling = [];
  const mappingScaling = [];
  
  for (let i = 0; i < whitelistAddresses.length; i++) {
    const user = await ethers.getSigner(whitelistAddresses[i]);
    const proof = merkleTree.getHexProof(leaves[i]);
    
    if (i < 3) {
      const tx = await multiContract.connect(user).claimWithBitmap(
        i,
        proof
      );
      
      const receipt = await tx.wait();
      bitmapScaling.push(receipt.gasUsed);
      
      console.log(`Bitmap mint #${i+1}: ${receipt.gasUsed.toString()} gas used`);
    } else {
      const tx = await multiContract.connect(user).claimWithMapping(
        i,
        proof
      );
      
      const receipt = await tx.wait();
      mappingScaling.push(receipt.gasUsed);
      
      console.log(`Mapping mint #${i+1}: ${receipt.gasUsed.toString()} gas used`);
    }
  }
  
  console.log("\nGas Cost Scaling (as more addresses mint):");
  for (let i = 0; i < bitmapScaling.length; i++) {
    console.log(`Bitmap mint #${i+1}: ${bitmapScaling[i].toString()} gas`);
  }
  
  for (let i = 0; i < mappingScaling.length; i++) {
    console.log(`Mapping mint #${i+1}: ${mappingScaling[i].toString()} gas`);
  }
  
  console.log("\nConclusion:");
  if (bitmapAvg.lt(mappingAvg)) {
    console.log(`The bitmap implementation is more gas efficient by ${mappingAvg.sub(bitmapAvg).toString()} gas on average.`);
  } else {
    console.log(`The mapping implementation is more gas efficient by ${bitmapAvg.sub(mappingAvg).toString()} gas on average.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 