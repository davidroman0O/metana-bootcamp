const { ethers } = require("hardhat");

async function main() {
  console.log("Simulating commit-reveal pattern for NFT randomization...");
  
  const [owner] = await ethers.getSigners();
  
  const AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
  const advancedNFT = await AdvancedNFT.deploy(
    "Advanced NFT",
    "ANFT",
    "https://example.com/api/token/"
  );
  
  await advancedNFT.deployed();
  console.log("AdvancedNFT deployed to:", advancedNFT.address);
  
  await advancedNFT.setState(2);
  console.log("State set to PublicSaleActive");
  
  console.log("Minting 5 NFTs...");
  await advancedNFT.publicMint(5, { value: ethers.utils.parseEther("0.4") });
  
  const tokenURI1 = await advancedNFT.tokenURI(0);
  const tokenURI2 = await advancedNFT.tokenURI(1);
  console.log("Token URI before reveal:");
  console.log(`Token #0: ${tokenURI1}`);
  console.log(`Token #1: ${tokenURI2}`);
  
  const nonce = Math.floor(Math.random() * 1000000);
  const blockNumber = await ethers.provider.getBlockNumber();
  const blockHash = (await ethers.provider.getBlock(blockNumber)).hash;
  
  console.log(`\nCreating commit with nonce: ${nonce}`);
  console.log(`Using blockhash from block #${blockNumber}: ${blockHash}`);
  
  const commitHash = ethers.utils.solidityKeccak256(
    ["uint256", "bytes32"],
    [nonce, blockHash]
  );
  
  console.log(`Generated commit hash: ${commitHash}`);
  
  await advancedNFT.submitCommit(commitHash);
  console.log("Commit submitted to contract");
  
  const committedHash = await advancedNFT.commitHash();
  const committedBlock = await advancedNFT.commitBlock();
  
  console.log(`Stored commit hash: ${committedHash}`);
  console.log(`Stored commit block: ${committedBlock}`);
  
  console.log(`\nMining ${await advancedNFT.BLOCKS_FOR_REVEAL()} blocks...`);
  for (let i = 0; i < await advancedNFT.BLOCKS_FOR_REVEAL(); i++) {
    await ethers.provider.send("evm_mine", []);
  }
  
  console.log("\nRevealing the commit...");
  await advancedNFT.reveal(nonce);
  
  const currentState = await advancedNFT.currentState();
  console.log(`Current state: ${currentState} (${currentState === 4 ? "Revealed" : "Not Revealed"})`);
  
  const randomSeed = await advancedNFT.randomSeed();
  console.log(`Random seed: ${randomSeed}`);
  
  const tokenURIAfter1 = await advancedNFT.tokenURI(0);
  const tokenURIAfter2 = await advancedNFT.tokenURI(1);
  console.log("\nToken URI after reveal:");
  console.log(`Token #0: ${tokenURIAfter1}`);
  console.log(`Token #1: ${tokenURIAfter2}`);
  
  console.log("\nRandomization demonstration:");
  const tokenURIs = {};
  for (let i = 0; i < 5; i++) {
    const uri = await advancedNFT.tokenURI(i);
    const tokenId = uri.split('/').pop();
    tokenURIs[i] = tokenId;
    console.log(`Original Token #${i} -> Revealed as Token #${tokenId}`);
  }
  
  console.log("\nCommit-reveal simulation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 