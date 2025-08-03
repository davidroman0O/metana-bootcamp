const { ethers } = require("hardhat");
const snapshot = require("@snapshot-labs/snapshot.js").default;
const fs = require("fs");
require("dotenv").config();

// Configuration
const SNAPSHOT_HUB = "https://testnet.hub.snapshot.org"; // Testnet hub for Sepolia

async function castVote() {
  console.log("===========================================");
  console.log("Casting Vote on Snapshot.org");
  console.log("===========================================\n");

  // Get signer - will use Ledger if configured
  const [voter] = await ethers.getSigners();
  console.log("Voting with account:", voter.address);

  // Load proposal data
  let proposalData;
  try {
    proposalData = JSON.parse(fs.readFileSync("snapshot-proposal.json", "utf8"));
  } catch (error) {
    console.error("❌ No proposal found. Create a proposal first!");
    console.error("Run: npx hardhat run scripts/snapshot/sepolia/create-proposal.js --network sepolia");
    process.exit(1);
  }

  console.log("\n📋 Proposal Details:");
  console.log("Title:", proposalData.title);
  console.log("ID:", proposalData.id);
  console.log("Space:", proposalData.space);
  console.log("Snapshot Block:", proposalData.snapshot);

  // Check if voting period is active
  const now = Math.floor(Date.now() / 1000);
  if (now < proposalData.startTime) {
    console.error("\n❌ Voting hasn't started yet!");
    process.exit(1);
  }
  if (now > proposalData.endTime) {
    console.error("\n❌ Voting period has ended!");
    process.exit(1);
  }

  // Initialize Snapshot client
  const client = new snapshot.Client712(SNAPSHOT_HUB);

  // Get user choice
  console.log("\n🗳️  Voting Options:");
  console.log("1. For");
  console.log("2. Against");
  console.log("3. Abstain");
  
  // For demo purposes, we'll vote "For" (choice 1)
  const choice = 1;
  console.log(`\nVoting: For (choice ${choice})`);

  // Check voting power at snapshot block
  try {
    const tokenContract = await ethers.getContractAt(
      "GovernanceToken",
      proposalData.tokenAddress
    );
    
    // Get current balance
    const currentBalance = await tokenContract.balanceOf(voter.address);
    console.log("\nCurrent token balance:", ethers.formatEther(currentBalance), "tokens");
    
    // Note: We can't easily get historical balance from the contract
    // but Snapshot will use the balance at the snapshot block
    console.log("Snapshot will use your balance at block:", proposalData.snapshot);
    
  } catch (error) {
    console.warn("⚠️  Could not check token balance:", error.message);
  }

  // Cast the vote
  try {
    console.log("\n🖊️  Casting vote...");
    console.log("⛽ Gas cost: 0 ETH! This is a gasless vote!");
    console.log("\nPlease sign the message with your wallet (Ledger will prompt)\n");

    const receipt = await client.vote(voter, voter.address, {
      space: proposalData.space,
      proposal: proposalData.id,
      type: "single-choice",
      choice: choice,
      reason: "Testing off-chain governance with Snapshot", // Optional comment
      app: "module-17-governance" // Your app name
    });

    console.log("\n✅ Vote cast successfully!");
    console.log("Vote ID:", receipt.id);
    console.log("IPFS hash:", receipt.ipfs);
    console.log("Your choice:", choice === 1 ? "For" : choice === 2 ? "Against" : "Abstain");
    
    // Save vote receipt
    const voteInfo = {
      proposalId: proposalData.id,
      voter: voter.address,
      choice: choice,
      voteId: receipt.id,
      ipfs: receipt.ipfs,
      votedAt: new Date().toISOString(),
      gasCost: "0 ETH (gasless!)"
    };

    // Save to array of votes
    let votes = [];
    if (fs.existsSync("snapshot-votes.json")) {
      votes = JSON.parse(fs.readFileSync("snapshot-votes.json", "utf8"));
    }
    votes.push(voteInfo);
    fs.writeFileSync("snapshot-votes.json", JSON.stringify(votes, null, 2));

    console.log("\n💾 Vote details saved to snapshot-votes.json");

    // Compare with on-chain voting
    console.log("\n===========================================");
    console.log("💰 Cost Comparison with On-chain Voting");
    console.log("===========================================");
    console.log("\nSnapshot (Off-chain):");
    console.log("- Vote cost: 0 ETH");
    console.log("- Transaction fee: 0 ETH");
    console.log("- Total cost: 0 ETH ✨");
    
    console.log("\nOn-chain Governor:");
    console.log("- Vote cost: ~0.002-0.005 ETH on Sepolia");
    console.log("- Higher on mainnet: ~0.01-0.05 ETH ($25-125)");
    console.log("- Excludes small token holders");

    console.log("\n🔐 Additional Benefits:");
    console.log("- Privacy: Votes can be encrypted (if Shutter enabled)");
    console.log("- No MEV: Votes can't be front-run");
    console.log("- Historical snapshot: Can't buy votes after proposal");

  } catch (error) {
    console.error("\n❌ Error casting vote:", error);
    console.error("\nTroubleshooting:");
    console.error("1. Make sure the proposal is still active");
    console.error("2. Check that you held tokens at the snapshot block");
    console.error("3. Ensure you haven't already voted");
    console.error("4. Verify network connection");
  }
}

// Execute
castVote()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });