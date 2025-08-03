import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getContractAddress } from "../scripts/helpers/save-addresses";

// Helper function to get signer with proper detection
async function getSignerWithInfo(hre: HardhatRuntimeEnvironment) {
  const [signer] = await hre.ethers.getSigners();
  
  // Check if we're using Ledger based on the network config
  const networkConfig = hre.network.config as any;
  const isLedger = networkConfig.ledgerAccounts && networkConfig.ledgerAccounts.length > 0;
  
  if (isLedger) {
    console.log("🔐 Using Ledger Hardware Wallet");
    console.log("   Account:", signer.address);
    console.log("   Please review and approve transactions on your device");
  } else {
    console.log("🔑 Using software wallet");
    console.log("   Account:", signer.address);
  }
  
  return { signer, isLedger };
}

task("gov:propose", "Create a governance proposal")
  .addParam("description", "Proposal description")
  .addParam("target", "Target contract (address or 'token'/'timelock'/'governor')")
  .addParam("value", "ETH value in wei (default: 0)", "0")
  .addParam("calldata", "Encoded function call")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Resolve target address
    let targetAddress = taskArgs.target;
    if (taskArgs.target.toLowerCase() === 'token') {
      targetAddress = getContractAddress("GovernanceToken", hre.network.name);
      if (!targetAddress) throw new Error("GovernanceToken not deployed");
    } else if (taskArgs.target.toLowerCase() === 'timelock') {
      targetAddress = getContractAddress("Timelock", hre.network.name);
      if (!targetAddress) throw new Error("Timelock not deployed");
    } else if (taskArgs.target.toLowerCase() === 'governor') {
      targetAddress = governorAddress;
    } else if (!ethers.isAddress(taskArgs.target)) {
      throw new Error("Target must be a valid address or 'token'/'timelock'/'governor'");
    }
    
    console.log(`\n📝 Creating governance proposal...`);
    console.log(`   From: ${signer.address}`);
    console.log(`   Target: ${targetAddress}`);
    
    try {
      if (isLedger) {
        console.log("\n⏳ Estimating gas for Ledger transaction...");
        const gasEstimate = await governor.propose.estimateGas(
          [targetAddress],
          [taskArgs.value || 0],
          [taskArgs.calldata],
          taskArgs.description
        );
        console.log(`   Estimated gas: ${gasEstimate.toString()}`);
        console.log("\n📱 Please approve the transaction on your Ledger device");
      }
      
      const tx = await governor.propose(
        [targetAddress],
        [taskArgs.value || 0],
        [taskArgs.calldata],
        taskArgs.description
      );
      
      console.log(`\n⏳ Transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
    const event = receipt?.logs
      .map((log: any) => governor.interface.parseLog(log))
      .find((log: any) => log?.name === "ProposalCreated");
    const proposalId = event?.args?.proposalId;
    
    console.log(`\n✅ Proposal created successfully!`);
    console.log(`   Proposal ID: ${proposalId}`);
    console.log(`   Description: ${taskArgs.description}`);
    
    return proposalId;
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else if (isLedger && error.message?.includes("disconnected")) {
        console.error("\n❌ Ledger device disconnected. Please reconnect and try again.");
      } else {
        console.error("\n❌ Error creating proposal:", error.message);
      }
      throw error;
    }
  });

task("gov:vote", "Vote on a proposal")
  .addParam("proposalid", "The proposal ID")
  .addParam("support", "0=Against, 1=For, 2=Abstain")
  .addOptionalParam("reason", "Reason for your vote")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Check voting power
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    const votes = await token.getVotes(signer.address);
    console.log(`🗳️ Your voting power: ${ethers.formatEther(votes)} tokens`);
    
    // Cast vote
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the vote transaction on your Ledger device");
      }
      
      const tx = taskArgs.reason 
        ? await governor.castVoteWithReason(
            taskArgs.proposalid,
            taskArgs.support,
            taskArgs.reason
          )
        : await governor.castVote(taskArgs.proposalid, taskArgs.support);
      
      console.log(`\n⏳ Vote submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Vote cast successfully!`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error casting vote:", error.message);
      }
      throw error;
    }
    
    // Show current state
    const state = await governor.state(taskArgs.proposalid);
    const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log(`📊 Proposal state: ${states[Number(state)]}`);
  });

task("gov:queue", "Queue a successful proposal")
  .addParam("proposalId", "The proposal ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Get proposal details from events
    console.log(`⏳ Queueing proposal ${taskArgs.proposalId}...`);
    
    // We need to retrieve the proposal data from the ProposalCreated event
    // Note: proposalId is not indexed, so we need to get all events and filter
    const filter = governor.filters.ProposalCreated();
    const events = await governor.queryFilter(filter);
    
    // Find the event with matching proposal ID
    const event = events.find(e => e.args.proposalId.toString() === taskArgs.proposalId.toString());
    if (!event) throw new Error("Proposal not found");
    
    // Extract the arrays from indexed args
    // ProposalCreated event has parameters in this order:
    // 0: proposalId, 1: proposer, 2: targets, 3: values, 4: signatures, 
    // 5: calldatas, 6: voteStart, 7: voteEnd, 8: description
    const targets = [...event.args[2]];
    const values = [...event.args[3]];
    const calldatas = [...event.args[5]];
    const description = event.args[8];
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the queue transaction on your Ledger device");
      }
      
      const tx = await governor.queue(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );
      
      console.log(`\n⏳ Queue transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Proposal queued in timelock!`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error queueing proposal:", error.message);
      }
      throw error;
    }
    
    // Calculate execution time
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    const delay = await timelock.getMinDelay();
    const executionTime = new Date(Date.now() + Number(delay) * 1000);
    console.log(`⏰ Can be executed after: ${executionTime.toLocaleString()}`);
  });

task("gov:execute", "Execute a queued proposal")
  .addParam("proposalId", "The proposal ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    const state = await governor.state(taskArgs.proposalId);
    const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log(`📊 Current proposal state: ${states[Number(state)]}`);
    
    if (state !== 5n) { // Queued
      throw new Error(`Proposal not in queued state. Current state: ${states[Number(state)]}`);
    }
    
    console.log(`🚀 Executing proposal ${taskArgs.proposalId}...`);
    
    // Get proposal details from events
    // Note: proposalId is not indexed, so we need to get all events and filter
    const filter = governor.filters.ProposalCreated();
    const events = await governor.queryFilter(filter);
    
    // Find the event with matching proposal ID
    const event = events.find(e => e.args.proposalId.toString() === taskArgs.proposalId.toString());
    if (!event) throw new Error("Proposal not found");
    
    // Extract the arrays from indexed args
    // ProposalCreated event has parameters in this order:
    // 0: proposalId, 1: proposer, 2: targets, 3: values, 4: signatures, 
    // 5: calldatas, 6: voteStart, 7: voteEnd, 8: description
    const targets = [...event.args[2]];
    const values = [...event.args[3]];
    const calldatas = [...event.args[5]];
    const description = event.args[8];
    
    // Check if timelock delay has passed
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    
    // Calculate the operation ID (same way governor does it)
    const descriptionHash = ethers.id(description);
    const operationId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address[]", "uint256[]", "bytes[]", "uint256", "bytes32"],
        [targets, values, calldatas, 0n, descriptionHash]
      )
    );
    
    // Check if operation is ready
    const isReady = await timelock.isOperationReady(operationId);
    if (!isReady) {
      const timestamp = await timelock.getTimestamp(operationId);
      const minDelay = await timelock.getMinDelay();
      const currentTime = Math.floor(Date.now() / 1000);
      const readyTime = Number(timestamp) + Number(minDelay);
      
      if (timestamp === 0n) {
        throw new Error("Operation not found in timelock. Was the proposal queued?");
      }
      
      const remainingTime = readyTime - currentTime;
      throw new Error(`Timelock delay not passed. Ready in ${remainingTime} seconds (${Math.ceil(remainingTime / 60)} minutes)`);
    }
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the execution transaction on your Ledger device");
      }
      
      const tx = await governor.execute(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );
      
      console.log(`\n⏳ Execution transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Proposal executed successfully!`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error executing proposal:", error.message);
      }
      throw error;
    }
  });

task("gov:queue-manual", "Queue a proposal with manual parameters (for event issues)")
  .addParam("target", "Target contract (address or 'token'/'timelock'/'governor')")
  .addParam("calldata", "Encoded function call")
  .addParam("description", "Proposal description")
  .addOptionalParam("value", "ETH value", "0")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Resolve target address
    let targetAddress = taskArgs.target;
    if (taskArgs.target.toLowerCase() === 'token') {
      targetAddress = getContractAddress("GovernanceToken", hre.network.name);
      if (!targetAddress) throw new Error("GovernanceToken not deployed");
    } else if (taskArgs.target.toLowerCase() === 'timelock') {
      targetAddress = getContractAddress("Timelock", hre.network.name);
      if (!targetAddress) throw new Error("Timelock not deployed");
    } else if (taskArgs.target.toLowerCase() === 'governor') {
      targetAddress = governorAddress;
    } else if (!ethers.isAddress(taskArgs.target)) {
      throw new Error("Target must be a valid address or 'token'/'timelock'/'governor'");
    }
    
    console.log(`⏳ Queueing proposal manually...`);
    console.log(`   Target: ${targetAddress}`);
    console.log(`   Calldata: ${taskArgs.calldata}`);
    console.log(`   Description: ${taskArgs.description}`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the queue transaction on your Ledger device");
      }
      
      const tx = await governor.queue(
        [targetAddress],
        [taskArgs.value],
        [taskArgs.calldata],
        ethers.id(taskArgs.description)
      );
      
      console.log(`\n⏳ Queue transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Proposal queued in timelock!`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error queueing proposal:", error.message);
      }
      throw error;
    }
    
    // Get timelock delay
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    const delay = await timelock.getMinDelay();
    const executionTime = new Date(Date.now() + Number(delay) * 1000);
    console.log(`⏰ Can be executed after: ${executionTime.toLocaleString()}`);
  });

task("gov:execute-manual", "Execute a proposal with manual parameters")
  .addParam("target", "Target contract (address or 'token'/'timelock'/'governor')") 
  .addParam("calldata", "Encoded function call")
  .addParam("description", "Proposal description")
  .addOptionalParam("value", "ETH value", "0")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Resolve target address
    let targetAddress = taskArgs.target;
    if (taskArgs.target.toLowerCase() === 'token') {
      targetAddress = getContractAddress("GovernanceToken", hre.network.name);
      if (!targetAddress) throw new Error("GovernanceToken not deployed");
    } else if (taskArgs.target.toLowerCase() === 'timelock') {
      targetAddress = getContractAddress("Timelock", hre.network.name);
      if (!targetAddress) throw new Error("Timelock not deployed");
    } else if (taskArgs.target.toLowerCase() === 'governor') {
      targetAddress = governorAddress;
    } else if (!ethers.isAddress(taskArgs.target)) {
      throw new Error("Target must be a valid address or 'token'/'timelock'/'governor'");
    }
    
    console.log(`🚀 Executing proposal manually...`);
    console.log(`   Target: ${targetAddress}`);
    console.log(`   Calldata: ${taskArgs.calldata}`);
    console.log(`   Description: ${taskArgs.description}`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the execution transaction on your Ledger device");
      }
      
      const tx = await governor.execute(
        [targetAddress],
        [taskArgs.value],
        [taskArgs.calldata],
        ethers.id(taskArgs.description)
      );
      
      console.log(`\n⏳ Execution transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Proposal executed successfully!`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error executing proposal:", error.message);
      }
      throw error;
    }
  });

task("gov:state", "Get comprehensive governance state")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    console.log(`\n📊 GOVERNANCE STATE REPORT\n${"=".repeat(50)}`);
    
    // Token info
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    const totalSupply = await token.totalSupply();
    console.log(`\n💰 Token Info:`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)}`);
    
    // Governor info
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    const votingDelay = await governor.votingDelay();
    const votingPeriod = await governor.votingPeriod();
    const proposalThreshold = await governor.proposalThreshold();
    const quorum = await governor["quorumNumerator()"]();
    
    console.log(`\n🏛️ Governor Settings:`);
    console.log(`   Voting Delay: ${votingDelay} blocks`);
    console.log(`   Voting Period: ${votingPeriod} blocks`);
    console.log(`   Proposal Threshold: ${ethers.formatEther(proposalThreshold)} tokens`);
    console.log(`   Quorum: ${quorum}%`);
    
    // Timelock info
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    const minDelay = await timelock.getMinDelay();
    console.log(`\n⏰ Timelock Settings:`);
    console.log(`   Min Delay: ${Number(minDelay) / 3600} hours`);
    
    // Recent proposals
    console.log(`\n📜 Recent Proposals:`);
    const filter = governor.filters.ProposalCreated();
    
    // Get current block number to avoid negative block numbers
    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Look back up to 1000 blocks
    const events = await governor.queryFilter(filter, fromBlock);
    
    for (const event of events.slice(-5)) { // Show last 5
      const proposalId = event.args.proposalId;
      const state = await governor.state(proposalId);
      const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      console.log(`   ID: ${proposalId.toString().slice(0, 10)}... - ${states[Number(state)]}`);
    }
  });

task("gov:delegate", "Delegate voting power")
  .addParam("to", "Address to delegate to (use 'self' for self-delegation)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress, signer);
    
    const delegateTo = taskArgs.to === "self" ? signer.address : taskArgs.to;
    
    console.log(`\n🤝 Delegating voting power to ${delegateTo}...`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the delegation transaction on your Ledger device");
      }
      
      const tx = await token.delegate(delegateTo);
      
      console.log(`\n⏳ Delegation transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      
      const votes = await token.getVotes(delegateTo);
      console.log(`\n✅ Delegation complete!`);
      console.log(`📊 ${delegateTo} now has ${ethers.formatEther(votes)} voting power`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error delegating:", error.message);
      }
      throw error;
    }
  });

task("gov:list", "List all proposals")
  .addOptionalParam("limit", "Maximum number to show", "10")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    console.log(`\n📜 PROPOSAL LIST\n${"=".repeat(50)}`);
    
    const filter = governor.filters.ProposalCreated();
    const events = await governor.queryFilter(filter);
    
    const limit = parseInt(taskArgs.limit);
    const recentEvents = events.slice(-limit);
    
    for (const event of recentEvents.reverse()) {
      const proposalId = event.args.proposalId;
      const proposer = event.args.proposer;
      const description = event.args.description;
      const snapshot = await governor.proposalSnapshot(proposalId);
      const deadline = await governor.proposalDeadline(proposalId);
      
      const state = await governor.state(proposalId);
      const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      
      console.log(`\n📋 Proposal ID: ${proposalId.toString().slice(0, 10)}...`);
      console.log(`   State: ${states[Number(state)]}`);
      console.log(`   Proposer: ${proposer}`);
      console.log(`   Description: ${description.slice(0, 50)}${description.length > 50 ? "..." : ""}`);
      console.log(`   Voting Period: Block ${snapshot} to ${deadline}`);
      
      // Get voting results if proposal has ended
      if (state >= 3n) {
        const votes = await governor.proposalVotes(proposalId);
        console.log(`   Votes For: ${ethers.formatEther(votes.forVotes)}`);
        console.log(`   Votes Against: ${ethers.formatEther(votes.againstVotes)}`);
        console.log(`   Votes Abstain: ${ethers.formatEther(votes.abstainVotes)}`);
      }
    }
    
    console.log(`\nTotal proposals found: ${events.length}`);
  });

task("gov:cancel", "Cancel a proposal")
  .addParam("proposalId", "The proposal ID to cancel")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Get proposal details from events
    const filter = governor.filters.ProposalCreated(taskArgs.proposalId);
    const events = await governor.queryFilter(filter);
    if (events.length === 0) throw new Error("Proposal not found");
    
    const event = events[0];
    
    console.log(`\n❌ Canceling proposal ${taskArgs.proposalId}...`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the cancel transaction on your Ledger device");
      }
      
      const tx = await governor.cancel(
        event.args.targets,
        event.args.values,
        event.args.calldatas,
        ethers.id(event.args.description)
      );
      
      console.log(`\n⏳ Cancel transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Proposal canceled successfully!`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error canceling proposal:", error.message);
      }
      throw error;
    }
  });

task("gov:setup-timelock", "Grant MINTER_ROLE to Timelock (required for governance)")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress, signer);
    
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    
    const MINTER_ROLE = await token.MINTER_ROLE();
    
    // Check if already granted
    const hasRole = await token.hasRole(MINTER_ROLE, timelockAddress);
    if (hasRole) {
      console.log(`\n✅ Timelock already has MINTER_ROLE`);
      return;
    }
    
    console.log(`\n🔑 Granting MINTER_ROLE to Timelock...`);
    console.log(`   Timelock: ${timelockAddress}`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the role grant transaction on your Ledger device");
      }
      
      const tx = await token.grantRole(MINTER_ROLE, timelockAddress);
      
      console.log(`\n⏳ Transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      
      console.log(`\n✅ MINTER_ROLE granted to Timelock!`);
      console.log(`   This allows governance proposals to mint tokens`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error granting role:", error.message);
      }
      throw error;
    }
  });

task("gov:grant-minter-role", "Grant MINTER_ROLE to an address (needed for timelock)")
  .addParam("to", "Address to grant MINTER_ROLE to")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress, signer);
    
    const MINTER_ROLE = await token.MINTER_ROLE();
    console.log(`\n🔑 Granting MINTER_ROLE to ${taskArgs.to}...`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the role grant transaction on your Ledger device");
      }
      
      const tx = await token.grantRole(MINTER_ROLE, taskArgs.to);
      
      console.log(`\n⏳ Role grant transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      
      console.log(`\n✅ MINTER_ROLE granted successfully!`);
      console.log(`   Role: ${MINTER_ROLE}`);
      console.log(`   Granted to: ${taskArgs.to}`);
      
      // Verify the role was granted
      const hasRole = await token.hasRole(MINTER_ROLE, taskArgs.to);
      console.log(`   Verification: ${hasRole ? "✅ Confirmed" : "❌ Failed"}`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error granting role:", error.message);
      }
      throw error;
    }
  });

task("gov:addresses", "Show all deployed contract addresses")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    console.log(`\n📍 DEPLOYED CONTRACT ADDRESSES\n${"=".repeat(50)}`);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    
    console.log(`\n💰 GovernanceToken: ${tokenAddress || "Not deployed"}`);
    console.log(`⏰ Timelock: ${timelockAddress || "Not deployed"}`);
    console.log(`🏛️ DAOGovernor: ${governorAddress || "Not deployed"}`);
    
    console.log(`\nNetwork: ${hre.network.name}`);
    console.log(`Config file: addresses/${hre.network.name}.json`);
  });

task("gov:propose-mint", "Create a proposal to mint tokens")
  .addParam("to", "Address to mint tokens to")
  .addParam("amount", "Amount of tokens to mint")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    // Get contract addresses
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Prepare mint calldata
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    const calldata = token.interface.encodeFunctionData("mint", [
      taskArgs.to,
      ethers.parseEther(taskArgs.amount)
    ]);
    
    const description = `Mint ${taskArgs.amount} tokens to ${taskArgs.to}`;
    
    console.log(`\n📝 Creating mint proposal...`);
    console.log(`   Target: ${tokenAddress} (GovernanceToken)`);
    console.log(`   Function: mint(${taskArgs.to}, ${taskArgs.amount})`);
    console.log(`   Calldata: ${calldata}`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the transaction on your Ledger device");
      }
      
      const tx = await governor.propose(
        [tokenAddress],
        [0],
        [calldata],
        description
      );
      
      console.log(`\n⏳ Transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: any) => governor.interface.parseLog(log))
        .find((log: any) => log?.name === "ProposalCreated");
      const proposalId = event?.args?.proposalId;
      
      console.log(`\n✅ Proposal created successfully!`);
      console.log(`   Proposal ID: ${proposalId}`);
      console.log(`\n📋 Next steps:`);
      console.log(`   1. Wait ~12 seconds (1 block)`);
      console.log(`   2. Vote: npx hardhat gov:vote --proposalid ${proposalId} --support 1 --network ${hre.network.name}`);
      console.log(`   3. Wait ~4 minutes (20 blocks)`);
      console.log(`   4. Queue: npx hardhat gov:queue --proposal-id ${proposalId} --network ${hre.network.name}`);
      console.log(`   5. Wait 5 minutes (timelock)`);
      console.log(`   6. Execute: npx hardhat gov:execute --proposal-id ${proposalId} --network ${hre.network.name}`);
      
      return proposalId;
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error creating proposal:", error.message);
      }
      throw error;
    }
  });

task("gov:check-roles", "Check governance roles for all contracts")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    console.log(`\n🔐 GOVERNANCE ROLES REPORT\n${"=".repeat(50)}`);
    
    // Token roles
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    
    const MINTER_ROLE = await token.MINTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    
    console.log(`\n💰 GovernanceToken Roles:`);
    console.log(`   Contract: ${tokenAddress}`);
    
    // Check deployer roles
    const [deployer] = await ethers.getSigners();
    console.log(`\n   Deployer (${deployer.address}):`);
    console.log(`     DEFAULT_ADMIN: ${await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address) ? "✅" : "❌"}`);
    console.log(`     MINTER_ROLE: ${await token.hasRole(MINTER_ROLE, deployer.address) ? "✅" : "❌"}`);
    console.log(`     PAUSER_ROLE: ${await token.hasRole(PAUSER_ROLE, deployer.address) ? "✅" : "❌"}`);
    
    // Check timelock roles
    console.log(`\n   Timelock (${timelockAddress}):`);
    console.log(`     DEFAULT_ADMIN: ${await token.hasRole(DEFAULT_ADMIN_ROLE, timelockAddress) ? "✅" : "❌"}`);
    console.log(`     MINTER_ROLE: ${await token.hasRole(MINTER_ROLE, timelockAddress) ? "✅" : "❌"}`);
    console.log(`     PAUSER_ROLE: ${await token.hasRole(PAUSER_ROLE, timelockAddress) ? "✅" : "❌"}`);
    
    // Timelock roles
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    
    console.log(`\n⏰ Timelock Roles:`);
    console.log(`   Contract: ${timelockAddress}`);
    console.log(`\n   Governor (${governorAddress}):`);
    console.log(`     PROPOSER_ROLE: ${await timelock.hasRole(PROPOSER_ROLE, governorAddress) ? "✅" : "❌"}`);
    console.log(`     CANCELLER_ROLE: ${await timelock.hasRole(CANCELLER_ROLE, governorAddress) ? "✅" : "❌"}`);
    
    console.log(`\n   Executor (0x0...0):`);
    console.log(`     EXECUTOR_ROLE: ${await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress) ? "✅" : "❌"} (public execution)`);
  });