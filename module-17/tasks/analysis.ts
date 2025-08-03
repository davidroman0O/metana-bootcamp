import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getContractAddress } from "../scripts/helpers/save-addresses";

task("analyze:proposal", "Analyze a specific proposal")
  .addParam("proposalId", "The proposal ID to analyze")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    console.log(`\n📊 PROPOSAL ANALYSIS\n${"=".repeat(50)}`);
    console.log(`Proposal ID: ${taskArgs.proposalId}`);
    
    // Get proposal state
    const state = await governor.state(taskArgs.proposalId);
    const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log(`State: ${states[Number(state)]}`);
    
    // Get proposal details
    const votes = await governor.proposalVotes(taskArgs.proposalId);
    const snapshot = await governor.proposalSnapshot(taskArgs.proposalId);
    const deadline = await governor.proposalDeadline(taskArgs.proposalId);
    
    console.log(`\n📈 Voting Summary:`);
    console.log(`   For: ${ethers.formatEther(votes.forVotes)} votes`);
    console.log(`   Against: ${ethers.formatEther(votes.againstVotes)} votes`);
    console.log(`   Abstain: ${ethers.formatEther(votes.abstainVotes)} votes`);
    
    // Calculate participation
    const totalVotes = votes.forVotes + votes.againstVotes + votes.abstainVotes;
    const totalSupply = await token.getPastTotalSupply(snapshot);
    const participation = (totalVotes * 10000n) / totalSupply;
    console.log(`   Participation: ${Number(participation) / 100}%`);
    
    // Check quorum
    const quorum = await governor.quorum(snapshot);
    const quorumReached = votes.forVotes >= quorum;
    console.log(`\n📋 Requirements:`);
    console.log(`   Quorum: ${ethers.formatEther(quorum)} (${quorumReached ? "✅ Met" : "❌ Not Met"})`);
    
    // Timeline
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`\n⏰ Timeline:`);
    console.log(`   Snapshot Block: ${snapshot}`);
    console.log(`   Deadline Block: ${deadline}`);
    console.log(`   Current Block: ${currentBlock}`);
    
    if (state === 1n) { // Active
      console.log(`   Blocks Remaining: ${Number(deadline) - currentBlock}`);
    }
  });

task("analyze:delegations", "Analyze delegation patterns")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    console.log(`\n🤝 DELEGATION ANALYSIS\n${"=".repeat(50)}`);
    
    // Get all delegation events
    const filter = token.filters.DelegateChanged();
    const events = await token.queryFilter(filter);
    
    // Build delegation map
    const delegations = new Map<string, Set<string>>();
    const delegators = new Map<string, string>();
    
    for (const event of events) {
      const delegator = event.args.delegator;
      const toDelegate = event.args.toDelegate;
      
      // Update delegator's current delegate
      delegators.set(delegator, toDelegate);
      
      // Update delegate's delegators
      if (!delegations.has(toDelegate)) {
        delegations.set(toDelegate, new Set());
      }
      
      // Remove from previous delegate if exists
      for (const [delegate, delegatorSet] of delegations) {
        if (delegate !== toDelegate) {
          delegatorSet.delete(delegator);
        }
      }
      
      delegations.get(toDelegate)!.add(delegator);
    }
    
    // Calculate voting power concentration
    const delegates: { address: string; votes: bigint; delegatorCount: number }[] = [];
    
    for (const [delegate, delegatorSet] of delegations) {
      const votes = await token.getVotes(delegate);
      if (votes > 0n) {
        delegates.push({
          address: delegate,
          votes,
          delegatorCount: delegatorSet.size
        });
      }
    }
    
    // Sort by voting power
    delegates.sort((a, b) => (b.votes > a.votes ? 1 : -1));
    
    console.log(`\n🏆 Top Delegates:`);
    const totalSupply = await token.totalSupply();
    
    for (const [index, delegate] of delegates.slice(0, 10).entries()) {
      const percentage = (delegate.votes * 10000n) / totalSupply;
      console.log(`\n${index + 1}. ${delegate.address}`);
      console.log(`   Voting Power: ${ethers.formatEther(delegate.votes)} (${Number(percentage) / 100}%)`);
      console.log(`   Delegators: ${delegate.delegatorCount}`);
    }
    
    // Concentration metrics
    const top10Votes = delegates.slice(0, 10).reduce((sum, d) => sum + d.votes, 0n);
    const top10Percentage = (top10Votes * 10000n) / totalSupply;
    
    console.log(`\n📊 Concentration Metrics:`);
    console.log(`   Top 10 Delegates Control: ${Number(top10Percentage) / 100}% of voting power`);
    console.log(`   Total Delegates with Power: ${delegates.length}`);
    console.log(`   Total Delegations: ${delegators.size}`);
  });

task("analyze:voting-power", "Analyze voting power distribution")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    console.log(`\n💪 VOTING POWER DISTRIBUTION\n${"=".repeat(50)}`);
    
    // Get all Transfer events to find holders
    const filter = token.filters.Transfer();
    const events = await token.queryFilter(filter);
    
    // Build holder set
    const holders = new Set<string>();
    for (const event of events) {
      if (event.args.to !== ethers.ZeroAddress) {
        holders.add(event.args.to);
      }
    }
    
    // Get voting power for each holder
    const votingPowers: { address: string; balance: bigint; votes: bigint }[] = [];
    const totalSupply = await token.totalSupply();
    
    for (const holder of holders) {
      const balance = await token.balanceOf(holder);
      const votes = await token.getVotes(holder);
      
      if (balance > 0n) {
        votingPowers.push({ address: holder, balance, votes });
      }
    }
    
    // Calculate distribution metrics
    votingPowers.sort((a, b) => (b.votes > a.votes ? 1 : -1));
    
    // Gini coefficient calculation
    let cumulativeVotes = 0n;
    let giniSum = 0n;
    
    for (let i = 0; i < votingPowers.length; i++) {
      cumulativeVotes += votingPowers[i].votes;
      giniSum += (BigInt(votingPowers.length - i) * votingPowers[i].votes);
    }
    
    // Gini coefficient would require complex calculation
    // Simplified metric: concentration ratio
    
    console.log(`\n📊 Distribution Metrics:`);
    console.log(`   Total Token Holders: ${votingPowers.length}`);
    console.log(`   Holders with Voting Power: ${votingPowers.filter(h => h.votes > 0n).length}`);
    console.log(`   Holders without Voting Power: ${votingPowers.filter(h => h.votes === 0n).length}`);
    
    // Voting power brackets
    const brackets = [
      { name: "Whale (>5%)", min: totalSupply * 5n / 100n, count: 0, total: 0n },
      { name: "Large (1-5%)", min: totalSupply / 100n, max: totalSupply * 5n / 100n, count: 0, total: 0n },
      { name: "Medium (0.1-1%)", min: totalSupply / 1000n, max: totalSupply / 100n, count: 0, total: 0n },
      { name: "Small (<0.1%)", max: totalSupply / 1000n, count: 0, total: 0n }
    ];
    
    for (const holder of votingPowers) {
      if (holder.votes > brackets[0].min!) {
        brackets[0].count++;
        brackets[0].total += holder.votes;
      } else if (holder.votes > brackets[1].min!) {
        brackets[1].count++;
        brackets[1].total += holder.votes;
      } else if (holder.votes > brackets[2].min!) {
        brackets[2].count++;
        brackets[2].total += holder.votes;
      } else if (holder.votes > 0n) {
        brackets[3].count++;
        brackets[3].total += holder.votes;
      }
    }
    
    console.log(`\n🎯 Voting Power Brackets:`);
    for (const bracket of brackets) {
      const percentage = bracket.total > 0n ? (bracket.total * 10000n) / totalSupply : 0n;
      console.log(`   ${bracket.name}: ${bracket.count} holders (${Number(percentage) / 100}% of power)`);
    }
  });

task("analyze:history", "Analyze governance history")
  .addOptionalParam("limit", "Number of proposals to analyze", "20")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    console.log(`\n📜 GOVERNANCE HISTORY\n${"=".repeat(50)}`);
    
    // Get all proposal events
    const filter = governor.filters.ProposalCreated();
    const events = await governor.queryFilter(filter);
    
    // Limit to recent proposals
    const recentEvents = events.slice(-parseInt(taskArgs.limit));
    
    console.log(`Found ${events.length} total proposals (showing last ${recentEvents.length})`);
    
    // Analyze each proposal
    const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    const stateCount: Record<string, number> = {};
    let totalParticipation = 0n;
    let participationCount = 0;
    
    for (const event of recentEvents) {
      const proposalId = event.args.proposalId;
      const state = await governor.state(proposalId);
      const stateName = states[Number(state)];
      
      stateCount[stateName] = (stateCount[stateName] || 0) + 1;
      
      // Get voting data for completed proposals
      if (state >= 3) { // Defeated or later
        const votes = await governor.proposalVotes(proposalId);
        const snapshot = await governor.proposalSnapshot(proposalId);
        const totalSupplyAtSnapshot = await token.getPastTotalSupply(snapshot);
        const totalVotes = votes.forVotes + votes.againstVotes + votes.abstainVotes;
        
        if (totalSupplyAtSnapshot > 0n) {
          const participation = (totalVotes * 10000n) / totalSupplyAtSnapshot;
          totalParticipation += participation;
          participationCount++;
        }
      }
    }
    
    console.log(`\n📊 Proposal Outcomes:`);
    for (const [state, count] of Object.entries(stateCount)) {
      const percentage = (count * 100) / recentEvents.length;
      console.log(`   ${state}: ${count} (${percentage.toFixed(1)}%)`);
    }
    
    if (participationCount > 0) {
      const avgParticipation = totalParticipation / BigInt(participationCount);
      console.log(`\n🗳️ Average Participation: ${Number(avgParticipation) / 100}%`);
    }
    
    // Success rate
    const executed = stateCount["Executed"] || 0;
    const total = recentEvents.length;
    const successRate = total > 0 ? (executed * 100) / total : 0;
    
    console.log(`\n✅ Success Rate: ${successRate.toFixed(1)}% of proposals executed`);
  });