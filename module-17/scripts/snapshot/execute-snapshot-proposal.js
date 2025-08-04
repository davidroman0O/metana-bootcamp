const { ethers } = require("hardhat");
const snapshot = require("@snapshot-labs/snapshot.js");
const fs = require("fs");
const path = require("path");

// Use the snapshot.js SDK instead of direct GraphQL
const hub = "https://testnet.hub.snapshot.org";
const client = new snapshot.Client712(hub);

async function getProposal(proposalId) {
  console.log("Fetching proposal:", proposalId);
  
  try {
    // Simple fetch using the SDK's built-in GraphQL client
    const query = {
      proposal: {
        __args: {
          id: proposalId
        },
        id: true,
        title: true,
        body: true,
        state: true,
        scores: true,
        choices: true,
        author: true,
        space: {
          id: true,
          name: true
        }
      }
    };
    
    // Use raw fetch since axios seems to hang
    const response = await fetch(`${hub}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            proposal(id: "${proposalId}") {
              id
              title
              body
              state
              scores
              choices
              author
              plugins
              space {
                id
                name
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return null;
    }
    
    return data.data.proposal;
  } catch (error) {
    console.error("Error fetching proposal:", error.message);
    return null;
  }
}

async function executeProposal(proposalId) {
  console.log("🔍 Fetching Snapshot proposal...\n");
  
  const proposal = await getProposal(proposalId);
  
  if (!proposal) {
    console.error("❌ Proposal not found!");
    return;
  }
  
  console.log(`📋 Proposal: ${proposal.title}`);
  console.log(`   Author: ${proposal.author}`);
  console.log(`   State: ${proposal.state}`);
  console.log(`   Results: For=${proposal.scores[0]}, Against=${proposal.scores[1] || 0}`);
  
  // Check if passed
  if (proposal.state !== 'closed') {
    console.log("\n⏳ Proposal is still active. Wait for it to close.");
    return;
  }
  
  if (proposal.scores[0] <= proposal.scores[1]) {
    console.log("\n❌ Proposal did not pass!");
    return;
  }
  
  console.log("\n✅ Proposal PASSED! Ready for manual execution.\n");
  
  // Show the proposal body
  console.log("📄 Proposal Content:");
  console.log("─".repeat(50));
  console.log(proposal.body);
  console.log("─".repeat(50));
  
  // Since this is "GIMME MONEY" proposal, let's execute a mint
  // You can customize this based on your proposal types
  console.log("\n🎯 Based on this proposal, here's what we'll execute:");
  console.log("   Action: Mint 100 DAO tokens");
  console.log("   To: 0x92145c8e548A87DFd716b1FD037a5e476a1f2a86 (proposal author)");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`   Executor: ${signer.address}`);
  
  // Check if using Ledger
  const networkConfig = hre.network.config;
  const isLedger = networkConfig.ledgerAccounts && networkConfig.ledgerAccounts.length > 0;
  
  if (isLedger) {
    console.log("\n🔐 Using Ledger Hardware Wallet");
  }
  
  // Confirm execution
  console.log("\n⚠️  Execute this mint? Type 'yes' to confirm:");
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    readline.question('> ', answer => {
      readline.close();
      resolve(answer);
    });
  });
  
  if (answer.toLowerCase() !== 'yes') {
    console.log("❌ Execution cancelled.");
    return;
  }
  
  // Load contract
  const addressesPath = path.join(__dirname, "../../addresses/sepolia.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  const token = await ethers.getContractAt("GovernanceToken", addresses.contracts.GovernanceToken);
  
  try {
    if (isLedger) {
      console.log("\n📱 Please approve the transaction on your Ledger device...");
    }
    
    console.log("\n🚀 Executing mint transaction...");
    const tx = await token.mint("0x92145c8e548A87DFd716b1FD037a5e476a1f2a86", ethers.parseEther("100"));
    
    console.log(`\n⏳ Transaction submitted!`);
    console.log(`   Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    
    console.log(`\n✅ EXECUTION SUCCESSFUL!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
    
  } catch (error) {
    console.error("\n❌ Execution failed:", error.message);
    if (error.message.includes("MINTER_ROLE")) {
      console.log("\n💡 Tip: Make sure your address has MINTER_ROLE on the token contract!");
    }
  }
}

// Main execution
async function main() {
  // For Hardhat scripts, we need to get the proposal ID from environment variable
  const proposalId = process.env.PROPOSAL_ID;
  
  if (!proposalId) {
    console.log("Usage: PROPOSAL_ID=0x... npx hardhat run scripts/snapshot/execute-snapshot-proposal.js --network sepolia");
    console.log("\nExample:");
    console.log("PROPOSAL_ID=0x31409199bb793ba21956eb514c726a00043091a802973497be3d0779bb2497eb npx hardhat run scripts/snapshot/execute-snapshot-proposal.js --network sepolia");
    process.exit(1);
  }
  
  await executeProposal(proposalId);
}

// Execute
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });