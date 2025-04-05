const { ethers } = require("hardhat");

async function main() {
  console.log("Simulating commit-reveal pattern for NFT randomization...");
  
  const [owner] = await ethers.getSigners();
  
  // Create a mock merkle root for deployment
  const mockMerkleRoot = ethers.utils.formatBytes32String("MOCK_MERKLE_ROOT");
  
  const AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
  const advancedNFT = await AdvancedNFT.deploy(
    "Advanced NFT",
    "ANFT",
    "https://whocares.wtf/api/token/",
    mockMerkleRoot
  );
  
  await advancedNFT.deployed();
  console.log("AdvancedNFT deployed to:", advancedNFT.address);
  
  await advancedNFT.setState(2); // Set to PublicSale
  console.log("State set to PublicSale");
  
  console.log("Minting 5 NFTs...");
  await advancedNFT.publicMint(5, { value: ethers.utils.parseEther("0.4") }); // 5 * 0.08 = 0.4 ETH
  
  const tokenURI1 = await advancedNFT.tokenURI(0);
  const tokenURI2 = await advancedNFT.tokenURI(1);
  console.log("Token URI before reveal:");
  console.log(`Token #0: ${tokenURI1}`);
  console.log(`Token #1: ${tokenURI2}`);
  
  // Create a secret for the commit-reveal
  const secret = ethers.utils.formatBytes32String("MySecret123");
  console.log(`\nCreating commit with secret: ${ethers.utils.parseBytes32String(secret)}`);
  
  // Calculate the commitment hash
  const commitHash = ethers.utils.solidityKeccak256(
    ["address", "bytes32"],
    [owner.address, secret]
  );
  
  console.log(`Generated commit hash: ${commitHash}`);
  
  // Submit the commitment
  await advancedNFT.commit(commitHash);
  console.log("Commit submitted to contract");
  
  // Get the commitment details
  const commitment = await advancedNFT.commitments(owner.address);
  console.log(`Stored commit hash: ${commitment.commit}`);
  console.log(`Stored commit block: ${commitment.block}`);
  
  // Wait for BLOCKS_FOR_REVEAL blocks
  const blocksToMine = await advancedNFT.BLOCKS_FOR_REVEAL();
  console.log(`\nMining ${blocksToMine} blocks...`);
  for (let i = 0; i < blocksToMine; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  
  console.log("\nRevealing the commit...");
  
  // Track totalSupply before reveal
  const beforeRevealSupply = await advancedNFT.totalSupply();
  
  // Perform the reveal
  const revealTx = await advancedNFT.reveal(secret);
  const revealReceipt = await revealTx.wait();
  
  // Find the TokenMinted event to get the new token ID
  const tokenMintedEvent = revealReceipt.events.find(event => event.event === "TokenMinted");
  let newTokenId = null;
  if (tokenMintedEvent) {
    newTokenId = tokenMintedEvent.args.tokenId.toString();
    console.log(`New token minted with ID: ${newTokenId}`);
  }
  
  const state = await advancedNFT.state();
  console.log(`Current state: ${state} (${state === 4 ? "Revealed" : "Not Revealed"})`);
  
  // Check token URIs after reveal
  const tokenURIAfter1 = await advancedNFT.tokenURI(0);
  const tokenURIAfter2 = await advancedNFT.tokenURI(1);
  console.log("\nToken URI after reveal:");
  console.log(`Token #0: ${tokenURIAfter1}`);
  console.log(`Token #1: ${tokenURIAfter2}`);
  
  // Check all token owners to see the randomization
  console.log("\nToken ownership after reveal:");
  console.log("Original tokens minted to owner:");
  for (let i = 0; i < 5; i++) {
    const owner = await advancedNFT.ownerOf(i);
    console.log(`Token #${i} owned by: ${owner === owner.address ? 'owner' : owner}`);
  }
  
  // Get the total supply after reveal
  const afterRevealSupply = await advancedNFT.totalSupply();
  console.log(`\nTotal supply after reveal: ${afterRevealSupply.toString()}`);
  console.log(`Tokens minted during reveal: ${afterRevealSupply.sub(beforeRevealSupply)}`);
  
  // Look for the new token that was minted during reveal
  if (newTokenId) {
    console.log(`\nNew token from reveal:`);
    try {
      const tokenOwner = await advancedNFT.ownerOf(newTokenId);
      console.log(`Token #${newTokenId} owned by: ${tokenOwner}`);
      
      const tokenUri = await advancedNFT.tokenURI(newTokenId);
      console.log(`Token #${newTokenId} URI: ${tokenUri}`);
    } catch (e) {
      console.log(`Error getting details for token ${newTokenId}: ${e.message}`);
    }
  } else {
    console.log("\nCouldn't identify the newly minted token from events. Checking all tokens...");
    
    // Try to find all valid token IDs
    for (let i = 5; i < 20; i++) {
      try {
        const owner = await advancedNFT.ownerOf(i);
        console.log(`Found token #${i} owned by: ${owner}`);
      } catch (e) {
        // Skip invalid tokens
      }
    }
  }
  
  console.log("\nCommit-reveal simulation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 