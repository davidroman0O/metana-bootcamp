import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getContractAddress } from "../scripts/helpers/save-addresses";

task("gov:propose", "Create a governance proposal")
  .addParam("description", "Proposal description")
  .addParam("target", "Target contract address")
  .addParam("value", "ETH value in wei (default: 0)", "0")
  .addParam("calldata", "Encoded function call")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    const tx = await governor.propose(
      [taskArgs.target],
      [taskArgs.value || 0],
      [taskArgs.calldata],
      taskArgs.description
    );
    
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log: any) => governor.interface.parseLog(log))
      .find((log: any) => log?.name === "ProposalCreated");
    const proposalId = event?.args?.proposalId;
    
    console.log(`✅ Proposal created with ID: ${proposalId}`);
    console.log(`📋 Description: ${taskArgs.description}`);
    
    return proposalId;
  });

task("gov:vote", "Vote on a proposal")
  .addParam("proposalid", "The proposal ID")
  .addParam("support", "0=Against, 1=For, 2=Abstain")
  .addOptionalParam("reason", "Reason for your vote")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    const [signer] = await ethers.getSigners();
    
    // Check voting power
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    const votes = await token.getVotes(signer.address);
    console.log(`🗳️ Your voting power: ${ethers.formatEther(votes)} tokens`);
    
    // Cast vote
    const tx = taskArgs.reason 
      ? await governor.castVoteWithReason(
          taskArgs.proposalid,
          taskArgs.support,
          taskArgs.reason
        )
      : await governor.castVote(taskArgs.proposalid, taskArgs.support);
    
    await tx.wait();
    console.log(`✅ Vote cast successfully!`);
    
    // Show current state
    const state = await governor.state(taskArgs.proposalid);
    const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log(`📊 Proposal state: ${states[Number(state)]}`);
  });

task("gov:queue", "Queue a successful proposal")
  .addParam("proposalId", "The proposal ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    // Get proposal details from events
    console.log(`⏳ Queueing proposal ${taskArgs.proposalId}...`);
    
    // We need to retrieve the proposal data from the ProposalCreated event
    const filter = governor.filters.ProposalCreated(taskArgs.proposalId);
    const events = await governor.queryFilter(filter);
    if (events.length === 0) throw new Error("Proposal not found");
    
    const event = events[0];
    const tx = await governor.queue(
      event.args.targets,
      event.args.values,
      event.args.calldatas,
      ethers.id(event.args.description)
    );
    
    await tx.wait();
    console.log(`✅ Proposal queued in timelock!`);
    
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
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    const state = await governor.state(taskArgs.proposalId);
    if (state !== 5n) { // Queued
      throw new Error(`Proposal not in queued state. Current state: ${state}`);
    }
    
    console.log(`🚀 Executing proposal ${taskArgs.proposalId}...`);
    
    // Get proposal details from events
    const filter = governor.filters.ProposalCreated(taskArgs.proposalId);
    const events = await governor.queryFilter(filter);
    if (events.length === 0) throw new Error("Proposal not found");
    
    const event = events[0];
    const tx = await governor.execute(
      event.args.targets,
      event.args.values,
      event.args.calldatas,
      ethers.id(event.args.description)
    );
    
    await tx.wait();
    console.log(`✅ Proposal executed successfully!`);
  });

task("gov:queue-manual", "Queue a proposal with manual parameters (for event issues)")
  .addParam("target", "Target contract address")
  .addParam("calldata", "Encoded function call")
  .addParam("description", "Proposal description")
  .addOptionalParam("value", "ETH value", "0")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    console.log(`⏳ Queueing proposal manually...`);
    console.log(`   Target: ${taskArgs.target}`);
    console.log(`   Calldata: ${taskArgs.calldata}`);
    console.log(`   Description: ${taskArgs.description}`);
    
    const tx = await governor.queue(
      [taskArgs.target],
      [taskArgs.value],
      [taskArgs.calldata],
      ethers.id(taskArgs.description)
    );
    
    await tx.wait();
    console.log(`✅ Proposal queued in timelock!`);
    
    // Get timelock delay
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    const delay = await timelock.getMinDelay();
    const executionTime = new Date(Date.now() + Number(delay) * 1000);
    console.log(`⏰ Can be executed after: ${executionTime.toLocaleString()}`);
  });

task("gov:execute-manual", "Execute a proposal with manual parameters")
  .addParam("target", "Target contract address") 
  .addParam("calldata", "Encoded function call")
  .addParam("description", "Proposal description")
  .addOptionalParam("value", "ETH value", "0")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    console.log(`🚀 Executing proposal manually...`);
    console.log(`   Target: ${taskArgs.target}`);
    console.log(`   Calldata: ${taskArgs.calldata}`);
    console.log(`   Description: ${taskArgs.description}`);
    
    const tx = await governor.execute(
      [taskArgs.target],
      [taskArgs.value],
      [taskArgs.calldata],
      ethers.id(taskArgs.description)
    );
    
    await tx.wait();
    console.log(`✅ Proposal executed successfully!`);
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
    const [signer] = await ethers.getSigners();
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    const delegateTo = taskArgs.to === "self" ? signer.address : taskArgs.to;
    
    console.log(`🤝 Delegating voting power to ${delegateTo}...`);
    const tx = await token.delegate(delegateTo);
    await tx.wait();
    
    const votes = await token.getVotes(delegateTo);
    console.log(`✅ Delegation complete!`);
    console.log(`📊 ${delegateTo} now has ${ethers.formatEther(votes)} voting power`);
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
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    // Get proposal details from events
    const filter = governor.filters.ProposalCreated(taskArgs.proposalId);
    const events = await governor.queryFilter(filter);
    if (events.length === 0) throw new Error("Proposal not found");
    
    const event = events[0];
    
    console.log(`❌ Canceling proposal ${taskArgs.proposalId}...`);
    
    const tx = await governor.cancel(
      event.args.targets,
      event.args.values,
      event.args.calldatas,
      ethers.id(event.args.description)
    );
    
    await tx.wait();
    console.log(`✅ Proposal canceled successfully!`);
  });

task("gov:grant-minter-role", "Grant MINTER_ROLE to an address (needed for timelock)")
  .addParam("to", "Address to grant MINTER_ROLE to")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    const MINTER_ROLE = await token.MINTER_ROLE();
    console.log(`🔑 Granting MINTER_ROLE to ${taskArgs.to}...`);
    
    const tx = await token.grantRole(MINTER_ROLE, taskArgs.to);
    await tx.wait();
    
    console.log(`✅ MINTER_ROLE granted successfully!`);
    console.log(`   Role: ${MINTER_ROLE}`);
    console.log(`   Granted to: ${taskArgs.to}`);
    
    // Verify the role was granted
    const hasRole = await token.hasRole(MINTER_ROLE, taskArgs.to);
    console.log(`   Verification: ${hasRole ? "✅ Confirmed" : "❌ Failed"}`);
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