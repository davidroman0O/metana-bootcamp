const { ethers } = require("hardhat");
const fs = require("fs");

async function compareGovernance() {
  console.log("===========================================");
  console.log("🏛️  GOVERNANCE SYSTEMS COMPARISON");
  console.log("===========================================\n");

  const [account] = await ethers.getSigners();
  console.log("Analyzing with account:", account.address);

  // Load deployment data
  let deployment;
  try {
    if (fs.existsSync("deployment-sepolia.json")) {
      deployment = JSON.parse(fs.readFileSync("deployment-sepolia.json", "utf8"));
    } else if (fs.existsSync("addresses/sepolia.json")) {
      deployment = JSON.parse(fs.readFileSync("addresses/sepolia.json", "utf8"));
    } else {
      // Use localhost for testing
      deployment = JSON.parse(fs.readFileSync("addresses/localhost.json", "utf8"));
      console.log("⚠️  Using localhost deployment for comparison\n");
    }
  } catch (error) {
    console.error("❌ No deployment found. Deploy contracts first!");
    process.exit(1);
  }

  // Get contracts
  const token = await ethers.getContractAt("GovernanceToken", deployment.contracts.GovernanceToken);
  const governor = await ethers.getContractAt("DAOGovernor", deployment.contracts.DAOGovernor);

  console.log("📊 FEATURE COMPARISON");
  console.log("====================\n");

  // 1. Voting Mechanism Comparison
  console.log("1️⃣  VOTING MECHANISM");
  console.log("--------------------");
  console.log("On-chain (Governor):");
  console.log("  - Direct contract interaction");
  console.log("  - Votes stored on blockchain");
  console.log("  - Immediate finality");
  console.log("  - Current balance determines voting power");
  
  console.log("\nOff-chain (Snapshot):");
  console.log("  - Signed messages (no transactions)");
  console.log("  - Votes stored on IPFS");
  console.log("  - Requires oracle for execution");
  console.log("  - Historical balance at snapshot block");

  // 2. Cost Analysis
  console.log("\n\n2️⃣  COST ANALYSIS");
  console.log("-----------------");
  
  // Estimate on-chain costs
  try {
    // Create a sample proposal for gas estimation
    const targets = [token.address];
    const values = [0];
    const calldatas = [token.interface.encodeFunctionData("transfer", [account.address, 1])];
    const description = "Test proposal for gas estimation";

    // Estimate proposal creation gas
    const proposalGas = await governor.estimateGas.propose(
      targets,
      values,
      calldatas,
      description
    ).catch(() => BigInt(200000)); // Default estimate if it fails

    // Estimate voting gas (castVote)
    const voteGas = BigInt(50000); // Typical vote gas

    console.log("On-chain Costs (Sepolia):");
    console.log(`  - Create proposal: ~${proposalGas.toString()} gas`);
    console.log(`  - Cast vote: ~${voteGas.toString()} gas`);
    console.log(`  - Total for 100 voters: ~${(voteGas * BigInt(100)).toString()} gas`);
    
    // Calculate ETH costs (assuming 20 gwei gas price)
    const gasPrice = ethers.parseUnits("20", "gwei");
    const proposalCostEth = ethers.formatEther(proposalGas * gasPrice);
    const voteCostEth = ethers.formatEther(voteGas * gasPrice);
    const totalCostEth = ethers.formatEther((voteGas * BigInt(100)) * gasPrice);
    
    console.log(`\n  - Proposal cost: ~${proposalCostEth} ETH`);
    console.log(`  - Vote cost: ~${voteCostEth} ETH per voter`);
    console.log(`  - 100 voters: ~${totalCostEth} ETH`);

  } catch (error) {
    console.log("On-chain Costs:");
    console.log("  - Create proposal: ~200,000 gas");
    console.log("  - Cast vote: ~50,000 gas");
    console.log("  - 100 voters: ~5,000,000 gas");
  }

  console.log("\nOff-chain Costs (Snapshot):");
  console.log("  - Create proposal: 0 gas");
  console.log("  - Cast vote: 0 gas");
  console.log("  - 100 voters: 0 gas");
  console.log("  - Execution bridge: ~100,000 gas (one-time)");

  // 3. Security Model
  console.log("\n\n3️⃣  SECURITY MODEL");
  console.log("------------------");
  console.log("On-chain:");
  console.log("  ✅ Fully decentralized");
  console.log("  ✅ No external dependencies");
  console.log("  ❌ Vulnerable to flash loans");
  console.log("  ❌ Public voting (no privacy)");
  
  console.log("\nOff-chain:");
  console.log("  ✅ Flash loan resistant (snapshot)");
  console.log("  ✅ Optional privacy (Shutter)");
  console.log("  ⚠️  Requires trusted UI");
  console.log("  ⚠️  Oracle for execution");

  // 4. Token Snapshot Demo
  console.log("\n\n4️⃣  TOKEN SNAPSHOT DEMONSTRATION");
  console.log("--------------------------------");
  
  const currentBalance = await token.balanceOf(account.address);
  console.log(`Your current balance: ${ethers.formatEther(currentBalance)} tokens`);
  
  console.log("\n📸 Snapshot Mechanism:");
  console.log("  - On-chain: Must hold tokens when voting");
  console.log("  - Snapshot: Uses balance at proposal creation block");
  console.log("\nExample scenario:");
  console.log("  1. Alice has 1000 tokens at block 100 (proposal created)");
  console.log("  2. Alice transfers all tokens at block 101");
  console.log("  3. On-chain: Alice CANNOT vote (0 balance)");
  console.log("  4. Snapshot: Alice CAN vote (had 1000 at block 100)");

  // 5. Accessibility
  console.log("\n\n5️⃣  ACCESSIBILITY");
  console.log("-----------------");
  console.log("On-chain:");
  console.log("  - Requires ETH for gas");
  console.log("  - Excludes small holders");
  console.log("  - Higher barrier to participation");
  
  console.log("\nOff-chain:");
  console.log("  - No ETH required");
  console.log("  - All token holders can vote");
  console.log("  - Increases participation");

  // 6. Use Case Recommendations
  console.log("\n\n6️⃣  USE CASE RECOMMENDATIONS");
  console.log("----------------------------");
  console.log("Use On-chain Governance for:");
  console.log("  - High-stakes decisions");
  console.log("  - Treasury management");
  console.log("  - Protocol parameters");
  console.log("  - Immutable execution needs");
  
  console.log("\nUse Off-chain Governance for:");
  console.log("  - Community signaling");
  console.log("  - Frequent decisions");
  console.log("  - Large voter base");
  console.log("  - Cost-sensitive operations");

  // 7. Summary Statistics
  console.log("\n\n📊 SUMMARY STATISTICS");
  console.log("====================");
  
  const governorInfo = {
    votingDelay: await governor.votingDelay(),
    votingPeriod: await governor.votingPeriod(),
    proposalThreshold: await governor.proposalThreshold(),
    quorum: await governor.quorumNumerator()
  };

  console.log("\nOn-chain Configuration:");
  console.log(`  - Voting delay: ${governorInfo.votingDelay} blocks`);
  console.log(`  - Voting period: ${governorInfo.votingPeriod} blocks`);
  console.log(`  - Proposal threshold: ${ethers.formatEther(governorInfo.proposalThreshold)} tokens`);
  console.log(`  - Quorum: ${governorInfo.quorum}%`);

  console.log("\nSnapshot Configuration:");
  console.log("  - Voting delay: 0 (immediate)");
  console.log("  - Voting period: Customizable (typically 3-7 days)");
  console.log("  - Proposal threshold: Customizable");
  console.log("  - Quorum: Customizable");

  // Save comparison report
  const comparisonReport = {
    generatedAt: new Date().toISOString(),
    network: deployment.network || "unknown",
    contracts: deployment.contracts,
    comparison: {
      costs: {
        onChain: {
          proposal: "~200,000 gas",
          vote: "~50,000 gas",
          hundredVoters: "~5,000,000 gas"
        },
        offChain: {
          proposal: "0 gas",
          vote: "0 gas",
          hundredVoters: "0 gas",
          execution: "~100,000 gas (one-time)"
        }
      },
      features: {
        onChain: ["Fully decentralized", "Immediate execution", "No external dependencies"],
        offChain: ["Gasless voting", "Flash loan resistant", "Privacy options", "Higher participation"]
      }
    }
  };

  fs.writeFileSync(
    "governance-comparison-report.json",
    JSON.stringify(comparisonReport, null, 2)
  );

  console.log("\n\n💾 Full report saved to governance-comparison-report.json");
  console.log("\n✅ Comparison complete!");
}

// Execute
compareGovernance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });