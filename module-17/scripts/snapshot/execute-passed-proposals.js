const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const SNAPSHOT_SPACE = process.env.SNAPSHOT_SPACE || "s-tn:0xarkaw.eth";
const SNAPSHOT_HUB = "https://testnet.hub.snapshot.org";

async function executePassedProposals() {
  console.log("🔍 Scanning Snapshot proposals for execution...\n");
  
  const [signer] = await ethers.getSigners();
  console.log("Executor:", signer.address);
  
  // Check if using Ledger
  const networkConfig = hre.network.config;
  const isLedger = networkConfig.ledgerAccounts && networkConfig.ledgerAccounts.length > 0;
  
  if (isLedger) {
    console.log("🔐 Using Ledger Hardware Wallet");
    console.log("   Please have your device ready\n");
  }

  // Load contract addresses
  const addressesPath = path.join(__dirname, "../../addresses/sepolia.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  const tokenAddress = addresses.contracts.GovernanceToken;
  
  // Get token contract
  const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
  
  try {
    // Fetch proposals from GraphQL
    const response = await fetch(`${SNAPSHOT_HUB}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            proposals(
              where: {
                space: "${SNAPSHOT_SPACE}"
                state: "closed"
              }
              orderBy: "created"
              orderDirection: desc
              first: 10
            ) {
              id
              title
              body
              state
              scores
              scores_total
              author
              created
            }
          }
        `
      })
    });
    
    const data = await response.json();
    const proposals = data.data.proposals || [];
    
    console.log(`Found ${proposals.length} recent closed proposals\n`);
    
    // Load execution history
    const executedPath = path.join(__dirname, "../../snapshot-executed.json");
    let executed = {};
    if (fs.existsSync(executedPath)) {
      executed = JSON.parse(fs.readFileSync(executedPath, "utf8"));
    }
    
    for (const proposal of proposals) {
      console.log(`\n📋 Proposal: ${proposal.title}`);
      console.log(`   ID: ${proposal.id}`);
      console.log(`   Author: ${proposal.author}`);
      console.log(`   Scores: For=${proposal.scores[0] || 0}, Against=${proposal.scores[1] || 0}`);
      
      // Skip if already executed
      if (executed[proposal.id]) {
        console.log("   ✓ Already executed on", new Date(executed[proposal.id].executedAt).toLocaleDateString());
        continue;
      }
      
      // Check if proposal passed
      if (proposal.scores[0] > (proposal.scores[1] || 0)) {
        console.log("   ✅ Proposal PASSED!");
        
        // For "GIMME MONEY" type proposals, execute mint
        if (proposal.title.toLowerCase().includes("money") || 
            proposal.title.toLowerCase().includes("mint") ||
            proposal.body.toLowerCase().includes("mint")) {
          
          console.log(`\n   🎯 This looks like a mint request`);
          console.log(`      Will mint 100 tokens to proposal author: ${proposal.author}`);
          
          // Ask for confirmation
          console.log("\n   Execute this mint? (yes/no)");
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const answer = await new Promise(resolve => {
            readline.question('   > ', answer => {
              readline.close();
              resolve(answer);
            });
          });
          
          if (answer.toLowerCase() === 'yes') {
            try {
              if (isLedger) {
                console.log("\n   📱 Please approve on your Ledger device...");
              }
              
              const tx = await token.mint(proposal.author, ethers.parseEther("100"));
              console.log(`\n   ⏳ Transaction submitted: ${tx.hash}`);
              
              const receipt = await tx.wait();
              console.log(`   ✅ Executed successfully!`);
              console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
              
              // Mark as executed
              executed[proposal.id] = {
                executedAt: new Date().toISOString(),
                txHash: tx.hash,
                executor: signer.address,
                action: "Minted 100 tokens to author"
              };
              fs.writeFileSync(executedPath, JSON.stringify(executed, null, 2));
              
            } catch (error) {
              console.error("   ❌ Execution failed:", error.message);
              if (error.message.includes("MINTER_ROLE")) {
                console.log("   💡 Make sure your address has MINTER_ROLE!");
              }
            }
          } else {
            console.log("   ⏭️  Skipped");
          }
        } else {
          console.log("   ℹ️  Not a mint request, skipping");
        }
      } else {
        console.log("   ❌ Did not pass");
      }
    }
    
    console.log("\n✅ Scan complete!");
    
  } catch (error) {
    console.error("Error fetching proposals:", error);
  }
}

// Add monitoring mode
async function monitor() {
  console.log("👁️  Monitoring mode - checking every 5 minutes...\n");
  
  while (true) {
    await executePassedProposals();
    console.log("\n⏰ Waiting 5 minutes before next check...\n");
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes
  }
}

// Check if monitor flag is passed
if (process.argv.includes("--monitor")) {
  monitor();
} else {
  executePassedProposals()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}