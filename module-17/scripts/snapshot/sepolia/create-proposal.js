const { ethers } = require("hardhat");
const snapshot = require("@snapshot-labs/snapshot.js").default;
const fs = require("fs");
require("dotenv").config();

// Configuration from environment variables
const SNAPSHOT_SPACE = process.env.SNAPSHOT_SPACE;
if (!SNAPSHOT_SPACE) {
  console.error("❌ SNAPSHOT_SPACE not set in .env file!");
  console.error("   Please set SNAPSHOT_SPACE=your-dao.eth in your .env file");
  process.exit(1);
}

// Snapshot hub URL - this is the same for all networks (mainnet, testnet, etc.)
// Snapshot.org uses the network ID in the proposal to determine which chain to use
const SNAPSHOT_HUB = "https://hub.snapshot.org";

// IMPORTANT: This script uses the SAME GovernanceToken that was deployed for on-chain governance
// The token serves dual purpose: on-chain governance (OpenZeppelin Governor) AND off-chain voting (Snapshot)

async function createSnapshotProposal() {
  console.log("===========================================");
  console.log("Creating Snapshot.org Proposal");
  console.log("===========================================\n");

  // Get signer - will use Ledger if configured
  const [signer] = await ethers.getSigners();
  console.log("Creating proposal with account:", signer.address);

  // Initialize Snapshot client
  const client = new snapshot.Client712(SNAPSHOT_HUB);

  // Get current block number - this is the SNAPSHOT BLOCK
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`\n📸 Snapshot block: ${blockNumber}`);
  console.log("All voting power will be calculated based on token balances at this block\n");

  // Load token address from deployment
  let tokenAddress;
  try {
    // Try to load from our deployment files
    if (fs.existsSync("deployment-sepolia.json")) {
      const deployment = JSON.parse(fs.readFileSync("deployment-sepolia.json", "utf8"));
      tokenAddress = deployment.contracts.GovernanceToken.address;
    } else if (fs.existsSync("addresses/sepolia.json")) {
      const addresses = JSON.parse(fs.readFileSync("addresses/sepolia.json", "utf8"));
      tokenAddress = addresses.contracts.GovernanceToken;
    } else {
      console.error("❌ No deployment file found. Deploy contracts first!");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error loading deployment:", error);
    process.exit(1);
  }

  console.log("Using GovernanceToken at:", tokenAddress);

  // Proposal configuration
  const proposalData = {
    space: SNAPSHOT_SPACE,
    type: "single-choice", // Basic yes/no/abstain vote
    title: "Test Proposal: Compare On-chain vs Off-chain Governance",
    body: `## Proposal Description

This is a test proposal to demonstrate the differences between on-chain and off-chain governance.

### Key Points:
- **Voting Cost**: This vote costs 0 gas! 🎉
- **Snapshot Block**: ${blockNumber}
- **Token Address**: ${tokenAddress}

### What we're testing:
1. Gasless voting through Snapshot
2. Historical balance snapshot mechanism
3. Privacy features (if Shutter enabled)
4. Vote delegation

### Important:
Even if you transfer your tokens after this proposal is created, you can still vote based on your balance at block ${blockNumber}.

This demonstrates the key difference from on-chain governance where only current token holders can vote.`,
    discussion: "",
    choices: ["For", "Against", "Abstain"],
    start: Math.floor(Date.now() / 1000), // Start now
    end: Math.floor(Date.now() / 1000) + 259200, // 3 days voting period
    snapshot: blockNumber,
    network: "11155111", // Sepolia chain ID
    plugins: JSON.stringify({}),
    metadata: JSON.stringify({
      network: "11155111",
      strategies: [
        {
          name: "erc20-balance-of",
          params: {
            address: tokenAddress,
            decimals: 18
          }
        }
      ]
    })
  };

  try {
    console.log("\n📝 Creating proposal...");
    console.log("Please sign the message with your wallet (Ledger will prompt)\n");

    // Create the proposal
    const receipt = await client.proposal(signer, signer.address, proposalData);

    console.log("✅ Proposal created successfully!");
    console.log("Proposal ID:", receipt.id);
    console.log("IPFS hash:", receipt.ipfs);
    console.log(`\nView on Snapshot: https://snapshot.org/#/${SNAPSHOT_SPACE}/proposal/${receipt.id}`);

    // Save proposal data for later use
    const proposalInfo = {
      id: receipt.id,
      ipfs: receipt.ipfs,
      title: proposalData.title,
      space: SNAPSHOT_SPACE,
      snapshot: blockNumber,
      tokenAddress: tokenAddress,
      startTime: proposalData.start,
      endTime: proposalData.end,
      createdBy: signer.address,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(
      "snapshot-proposal.json",
      JSON.stringify(proposalInfo, null, 2)
    );

    console.log("\n💾 Proposal details saved to snapshot-proposal.json");

    // Demonstrate the snapshot mechanism
    console.log("\n===========================================");
    console.log("🔍 Snapshot Mechanism Demonstration");
    console.log("===========================================");
    console.log(`\nVoting power is determined by token balance at block ${blockNumber}`);
    console.log("Even if tokens are transferred after this block, voting power remains unchanged!");
    console.log("\nThis is different from on-chain governance where:");
    console.log("- Only current token holders can vote");
    console.log("- Transferring tokens = losing voting power");
    console.log("\nTry transferring tokens and then voting to see the difference!");

  } catch (error) {
    console.error("\n❌ Error creating proposal:", error);
    console.error("\nTroubleshooting:");
    console.error("1. Make sure you've created a Snapshot space");
    console.error("2. Update SNAPSHOT_SPACE constant in this script");
    console.error("3. Ensure your wallet has voting power (holds tokens)");
    console.error("4. Check that you're using the correct network");
  }
}

// Execute
createSnapshotProposal()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });