import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getContractAddress } from "../scripts/helpers/save-addresses";
import { ethers } from "ethers";

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

// Helper function to validate Ethereum address
function validateAddress(address: string, name: string = "Address"): void {
  if (!ethers.isAddress(address)) {
    throw new Error(`${name} is not a valid Ethereum address: ${address}`);
  }
}

// Helper function to validate proposal ID
function validateProposalId(proposalId: string): void {
  try {
    // Check if it's a valid number (BigInt)
    const id = BigInt(proposalId);
    if (id < 0n) {
      throw new Error("Proposal ID must be positive");
    }
  } catch (error) {
    throw new Error(`Invalid proposal ID format: ${proposalId}. Expected a numeric value.\nExample: --proposalid 12345678901234567890\nTo list proposals: npx hardhat gov:list`);
  }
}

// Helper function to validate amount
function validateAmount(amount: string): void {
  try {
    const value = ethers.parseEther(amount);
    if (value <= 0n) {
      throw new Error("Amount must be greater than 0");
    }
  } catch (error) {
    throw new Error(`Invalid amount format: ${amount}. Expected a decimal number.\nExamples:\n  --amount 100      (100 tokens)\n  --amount 100.5    (100.5 tokens)\n  --amount 0.001    (0.001 tokens)`);
  }
}

// Helper function to validate vote support value
function validateVoteSupport(support: string): number {
  const supportNum = parseInt(support);
  if (isNaN(supportNum) || supportNum < 0 || supportNum > 2) {
    throw new Error(`Invalid vote support value: ${support}\nSupport must be:\n  0 = Against\n  1 = For\n  2 = Abstain\nExample: --support 1 (to vote For)`);
  }
  return supportNum;
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
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
      throw new Error(`Invalid target: ${taskArgs.target}. Must be either:\n- A valid Ethereum address (0x...)\n- 'token' for GovernanceToken\n- 'timelock' for Timelock contract\n- 'governor' for DAOGovernor contract`);
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
      } else if (error.message?.includes("InsufficientProposerVotes")) {
        console.error("\n❌ Insufficient voting power to create proposal.");
        console.error("   You need at least", ethers.formatEther(await governor.proposalThreshold()), "voting power.");
        console.error("   1. Ensure you have enough tokens");
        console.error("   2. Delegate voting power to yourself: npx hardhat gov:delegate --to self");
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
    
    // Validate inputs
    validateProposalId(taskArgs.proposalid);
    const support = validateVoteSupport(taskArgs.support);
    
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Check voting power
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) {
      throw new Error("GovernanceToken not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    const votes = await token.getVotes(signer.address);
    console.log(`🗳️ Your voting power: ${ethers.formatEther(votes)} tokens`);
    
    if (votes === 0n) {
      console.error("\n⚠️ Warning: You have 0 voting power!");
      console.error("   Your vote will not be counted.");
      console.error("   To fix: 1) Get tokens, 2) Delegate to yourself: npx hardhat gov:delegate --to self");
    }
    
    // Cast vote
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the vote transaction on your Ledger device");
      }
      
      const tx = taskArgs.reason 
        ? await governor.castVoteWithReason(
            taskArgs.proposalid,
            support,
            taskArgs.reason
          )
        : await governor.castVote(taskArgs.proposalid, support);
      
      console.log(`\n⏳ Vote submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Vote cast successfully!`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else if (error.message?.includes("AlreadyCastVote")) {
        console.error("\n❌ You have already voted on this proposal.");
        console.error("   Each address can only vote once per proposal.");
      } else if (error.message?.includes("VotingPeriodOver")) {
        console.error("\n❌ Voting period has ended for this proposal.");
        console.error("   Check proposal state: npx hardhat gov:state");
      } else if (error.message?.includes("ProposalNotActive")) {
        console.error("\n❌ Proposal is not in Active state.");
        console.error("   Voting may not have started yet or already ended.");
        console.error("   Check state: npx hardhat gov:votes --proposalid", taskArgs.proposalid);
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
  .addParam("proposalid", "The proposal ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    // Validate inputs
    validateProposalId(taskArgs.proposalid);
    
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    // Get proposal details from events
    console.log(`⏳ Queueing proposal ${taskArgs.proposalid}...`);
    
    // We need to retrieve the proposal data from the ProposalCreated event
    // Note: proposalId is not indexed, so we need to get all events and filter
    const filter = governor.filters.ProposalCreated();
    const events = await governor.queryFilter(filter);
    
    // Find the event with matching proposal ID
    const event = events.find(e => e.args.proposalId.toString() === taskArgs.proposalid.toString());
    if (!event) {
      throw new Error(`Proposal ${taskArgs.proposalid} not found. Please check the proposal ID or ensure the proposal was created on this network.`);
    }
    
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
    if (!timelockAddress) {
      throw new Error("Timelock not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    const delay = await timelock.getMinDelay();
    const executionTime = new Date(Date.now() + Number(delay) * 1000);
    console.log(`⏰ Can be executed after: ${executionTime.toLocaleString()}`);
  });

task("gov:execute", "Execute a queued proposal")
  .addParam("proposalid", "The proposal ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    // Validate inputs
    validateProposalId(taskArgs.proposalid);
    
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    const state = await governor.state(taskArgs.proposalid);
    const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log(`📊 Current proposal state: ${states[Number(state)]}`);
    
    if (state !== 5n) { // Queued
      throw new Error(`Cannot execute proposal ${taskArgs.proposalid}. Current state: ${states[Number(state)]}. Proposal must be in 'Queued' state to execute. Please queue it first using: npx hardhat gov:queue --proposalid ${taskArgs.proposalid}`);
    }
    
    console.log(`🚀 Executing proposal ${taskArgs.proposalid}...`);
    
    // Get proposal details from events
    // Note: proposalId is not indexed, so we need to get all events and filter
    const filter = governor.filters.ProposalCreated();
    const events = await governor.queryFilter(filter);
    
    // Find the event with matching proposal ID
    const event = events.find(e => e.args.proposalId.toString() === taskArgs.proposalid.toString());
    if (!event) {
      throw new Error(`Proposal ${taskArgs.proposalid} not found. Please check the proposal ID or ensure the proposal was created on this network.`);
    }
    
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
    if (!timelockAddress) {
      throw new Error("Timelock not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    
    // Calculate the operation ID using timelock's hashOperationBatch
    // IMPORTANT: GovernorTimelockControl uses a special salt calculation:
    // salt = bytes20(address(governor)) ^ descriptionHash
    const descriptionHash = ethers.id(description);
    
    // Convert governor address to bytes20 then pad to bytes32
    const governorBytes20 = ethers.zeroPadValue(governorAddress, 20);
    const governorBytes32 = ethers.zeroPadBytes(governorBytes20, 32);
    
    // XOR with description hash
    const salt = ethers.toBigInt(governorBytes32) ^ ethers.toBigInt(descriptionHash);
    const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
    
    const operationId = await timelock.hashOperationBatch(
      targets,
      values,
      calldatas,
      ethers.ZeroHash, // predecessor (always 0 for governor operations)
      saltBytes32      // salt = bytes20(governor) ^ descriptionHash
    );
    
    // Check if operation is ready
    const isReady = await timelock.isOperationReady(operationId);
    if (!isReady) {
      const timestamp = await timelock.getTimestamp(operationId);
      const minDelay = await timelock.getMinDelay();
      const currentTime = Math.floor(Date.now() / 1000);
      const readyTime = Number(timestamp) + Number(minDelay);
      
      if (timestamp === 0n) {
        throw new Error(`Operation not found in timelock for proposal ${taskArgs.proposalid}. This usually happens when:\n1. The proposal was not queued yet - run: npx hardhat gov:queue --proposalid ${taskArgs.proposalid}\n2. The proposal description changed between queue and execute\n3. There's a salt calculation mismatch (this has been fixed in the latest version)`);
      }
      
      const remainingTime = readyTime - currentTime;
      throw new Error(`Cannot execute yet - timelock delay not passed. Ready in ${remainingTime} seconds (${Math.ceil(remainingTime / 60)} minutes).\nThe timelock delay is a security feature that prevents immediate execution of proposals.\nPlease wait and try again after: ${new Date(readyTime * 1000).toLocaleString()}`);
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
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
      throw new Error(`Invalid target: ${taskArgs.target}. Must be either:\n- A valid Ethereum address (0x...)\n- 'token' for GovernanceToken\n- 'timelock' for Timelock contract\n- 'governor' for DAOGovernor contract`);
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
    if (!timelockAddress) {
      throw new Error("Timelock not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
      throw new Error(`Invalid target: ${taskArgs.target}. Must be either:\n- A valid Ethereum address (0x...)\n- 'token' for GovernanceToken\n- 'timelock' for Timelock contract\n- 'governor' for DAOGovernor contract`);
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
    if (!tokenAddress) {
      throw new Error("GovernanceToken not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    const totalSupply = await token.totalSupply();
    console.log(`\n💰 Token Info:`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)}`);
    
    // Governor info
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
    if (!timelockAddress) {
      throw new Error("Timelock not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
    
    // Validate input
    if (taskArgs.to !== "self") {
      validateAddress(taskArgs.to, "Delegate address");
    }
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) {
      throw new Error("GovernanceToken not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
      
      if (delegateTo === signer.address) {
        console.log("\n🎆 You can now:");
        console.log("   1. Create proposals (if you have enough voting power)");
        console.log("   2. Vote on active proposals");
        console.log("   3. Check your voting power anytime: npx hardhat token:balance --address", signer.address);
      }
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else if (error.message?.includes("insufficient funds")) {
        console.error("\n❌ Insufficient ETH for gas fees.");
        console.error("   Please add ETH to your account to pay for transaction fees.");
      } else {
        console.error("\n❌ Error delegating:", error.message);
        console.error("\n💡 Tip: Delegation is required to participate in governance.");
        console.error("   Even if you hold tokens, you must delegate to activate voting power.");
      }
      throw error;
    }
  });

task("gov:list", "List all proposals")
  .addOptionalParam("limit", "Maximum number to show", "10")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
  .addParam("proposalid", "The proposal ID to cancel")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    // Validate inputs
    validateProposalId(taskArgs.proposalid);
    
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress, signer);
    
    console.log(`\n❌ Attempting to cancel proposal ${taskArgs.proposalid}...`);
    
    // For now, we'll require the user to provide the proposal details
    // This is a workaround for the event structure parsing issue
    console.log("\n⚠️  Note: Due to event structure limitations, you need to manually provide proposal details.");
    console.log("   To cancel a proposal, please use the following approach:");
    console.log("   1. Note down the exact targets, values, calldatas, and description from when you created the proposal");
    console.log("   2. Use the governor contract directly with these exact parameters");
    console.log("\n   This task will be improved in a future version to automatically fetch proposal details.");
    
    throw new Error("gov:cancel task currently requires manual proposal detail entry. Please see the instructions above.");
  });

task("gov:setup-timelock", "Grant MINTER_ROLE to Timelock (required for governance)")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) {
      throw new Error("GovernanceToken not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress, signer);
    
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) {
      throw new Error("Timelock not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    
    const MINTER_ROLE = await token.MINTER_ROLE();
    
    // Check if already granted
    const hasRole = await token.hasRole(MINTER_ROLE, timelockAddress);
    if (hasRole) {
      console.log(`\n✅ Timelock already has MINTER_ROLE`);
      console.log(`   No action needed - governance can already mint tokens.`);
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
    
    // Validate inputs
    validateAddress(taskArgs.to, "Grant recipient address");
    
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) {
      throw new Error("GovernanceToken not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
    
    // Validate inputs
    validateAddress(taskArgs.to, "Recipient address");
    validateAmount(taskArgs.amount);
    
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    // Get contract addresses
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) {
      throw new Error("GovernanceToken not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
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
      console.log(`   4. Queue: npx hardhat gov:queue --proposalid ${proposalId} --network ${hre.network.name}`);
      console.log(`   5. Wait 5 minutes (timelock)`);
      console.log(`   6. Execute: npx hardhat gov:execute --proposalid ${proposalId} --network ${hre.network.name}`);
      
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
    if (!tokenAddress) {
      throw new Error("GovernanceToken not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) {
      throw new Error("Timelock not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    
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
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    
    console.log(`\n⏰ Timelock Roles:`);
    console.log(`   Contract: ${timelockAddress}`);
    console.log(`\n   Governor (${governorAddress}):`);
    console.log(`     PROPOSER_ROLE: ${await timelock.hasRole(PROPOSER_ROLE, governorAddress) ? "✅" : "❌"}`);
    console.log(`     CANCELLER_ROLE: ${await timelock.hasRole(CANCELLER_ROLE, governorAddress) ? "✅" : "❌"}`);
    
    console.log(`\n   Executor (0x0...0):`);
    console.log(`     EXECUTOR_ROLE: ${await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress) ? "✅" : "❌"} (public execution)`);
  });

task("gov:validate-proposal", "Validate a proposal's current state and readiness")
  .addParam("proposalid", "The proposal ID to validate")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    // Validate inputs
    validateProposalId(taskArgs.proposalid);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    console.log(`\n🔍 PROPOSAL VALIDATION REPORT\n${"=".repeat(50)}`);
    console.log(`Proposal ID: ${taskArgs.proposalid}`);
    
    try {
      // Get proposal state
      const state = await governor.state(taskArgs.proposalid);
      const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      console.log(`\n📊 Current State: ${states[Number(state)]}`);
      
      // Get proposal details from events
      const filter = governor.filters.ProposalCreated();
      const events = await governor.queryFilter(filter);
      const event = events.find(e => e.args.proposalId.toString() === taskArgs.proposalid.toString());
      
      if (!event) {
        console.error("\n❌ Proposal not found in events.");
        console.error("   This could mean the proposal was created on a different network.");
        return;
      }
      
      // Extract proposal details
      const targets = [...event.args[2]];
      const values = [...event.args[3]];
      const calldatas = [...event.args[5]];
      const description = event.args[8];
      
      console.log(`\n📋 Proposal Details:`);
      console.log(`   Proposer: ${event.args.proposer}`);
      console.log(`   Description: ${description.slice(0, 80)}${description.length > 80 ? "..." : ""}`);
      console.log(`   Targets: ${targets.length} contract(s)`);
      
      // Check voting
      if (state >= 1n && state <= 2n) { // Active or Canceled
        const votes = await governor.proposalVotes(taskArgs.proposalid);
        console.log(`\n🗳️ Voting Progress:`);
        console.log(`   For: ${ethers.formatEther(votes.forVotes)} votes`);
        console.log(`   Against: ${ethers.formatEther(votes.againstVotes)} votes`);
        console.log(`   Abstain: ${ethers.formatEther(votes.abstainVotes)} votes`);
        
        const snapshot = await governor.proposalSnapshot(taskArgs.proposalid);
        const quorum = await governor.quorum(snapshot);
        const quorumReached = votes.forVotes >= quorum;
        console.log(`   Quorum: ${ethers.formatEther(quorum)} (${quorumReached ? "✅ Met" : "❌ Not Met"})`);
      }
      
      // State-specific guidance
      console.log(`\n💡 Next Steps:`);
      switch (Number(state)) {
        case 0: // Pending
          console.log("   ⏳ Wait for voting to start (1 block)");
          console.log(`   Then vote: npx hardhat gov:vote --proposalid ${taskArgs.proposalid} --support 1`);
          break;
        case 1: // Active
          console.log("   🗳️ Voting is open!");
          console.log(`   Vote now: npx hardhat gov:vote --proposalid ${taskArgs.proposalid} --support 1`);
          const deadline = await governor.proposalDeadline(taskArgs.proposalid);
          const currentBlock = await ethers.provider.getBlockNumber();
          console.log(`   Blocks remaining: ${Number(deadline) - currentBlock}`);
          break;
        case 2: // Canceled
          console.log("   ❌ Proposal was canceled. No further action possible.");
          break;
        case 3: // Defeated
          console.log("   ❌ Proposal was defeated (didn't reach quorum or majority).");
          console.log("   Consider creating a new proposal with modifications.");
          break;
        case 4: // Succeeded
          console.log("   ✅ Proposal succeeded! Ready to queue.");
          console.log(`   Queue now: npx hardhat gov:queue --proposalid ${taskArgs.proposalid}`);
          break;
        case 5: // Queued
          const timelockAddress = getContractAddress("Timelock", hre.network.name);
          if (timelockAddress) {
            const timelock = await ethers.getContractAt("Timelock", timelockAddress);
            
            // Calculate operation ID
            const descriptionHash = ethers.id(description);
            const governorBytes20 = ethers.zeroPadValue(governorAddress, 20);
            const governorBytes32 = ethers.zeroPadBytes(governorBytes20, 32);
            const salt = ethers.toBigInt(governorBytes32) ^ ethers.toBigInt(descriptionHash);
            const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
            
            const operationId = await timelock.hashOperationBatch(
              targets,
              values,
              calldatas,
              ethers.ZeroHash,
              saltBytes32
            );
            
            const timestamp = await timelock.getTimestamp(operationId);
            const minDelay = await timelock.getMinDelay();
            const readyTime = Number(timestamp) + Number(minDelay);
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (currentTime >= readyTime) {
              console.log("   ✅ Timelock delay passed! Ready to execute.");
              console.log(`   Execute now: npx hardhat gov:execute --proposalid ${taskArgs.proposalid}`);
            } else {
              const remainingTime = readyTime - currentTime;
              console.log(`   ⏳ In timelock. Ready in ${remainingTime} seconds (${Math.ceil(remainingTime / 60)} minutes)`);
              console.log(`   Execute after: ${new Date(readyTime * 1000).toLocaleString()}`);
            }
          }
          break;
        case 6: // Expired
          console.log("   ⏰ Proposal expired. It was queued but not executed in time.");
          console.log("   Consider creating a new proposal.");
          break;
        case 7: // Executed
          console.log("   ✅ Proposal was successfully executed!");
          console.log("   No further action needed.");
          break;
      }
      
    } catch (error: any) {
      console.error("\n❌ Error validating proposal:", error.message);
    }
  });

task("gov:votes", "Check voting progress for a proposal")
  .addParam("proposalid", "The proposal ID to check votes for")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    // Validate inputs
    validateProposalId(taskArgs.proposalid);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    console.log(`📊 Checking votes for proposal ${taskArgs.proposalid}...`);
    
    try {
      // Get proposal state
      const state = await governor.state(taskArgs.proposalid);
      const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      console.log(`\n📋 Proposal State: ${states[Number(state)]}`);
      
      // Get voting data
      const votes = await governor.proposalVotes(taskArgs.proposalid);
      console.log(`\n🗳️ Current Votes:`);
      console.log(`   For: ${ethers.formatEther(votes.forVotes)} votes`);
      console.log(`   Against: ${ethers.formatEther(votes.againstVotes)} votes`);
      console.log(`   Abstain: ${ethers.formatEther(votes.abstainVotes)} votes`);
      
      const totalVotes = votes.forVotes + votes.againstVotes + votes.abstainVotes;
      console.log(`   Total: ${ethers.formatEther(totalVotes)} votes`);
      
      // Check if user has voted
      const [signer] = await ethers.getSigners();
      try {
        const hasVoted = await governor.hasVoted(taskArgs.proposalid, signer.address);
        console.log(`\n👤 Your Vote: ${hasVoted ? "✅ Already voted" : "❌ Not voted yet"}`);
      } catch (error) {
        // hasVoted might not be available in older versions
      }
      
      // Check quorum
      const snapshot = await governor.proposalSnapshot(taskArgs.proposalid);
      const quorum = await governor.quorum(snapshot);
      const quorumReached = votes.forVotes >= quorum;
      console.log(`\n📋 Quorum: ${ethers.formatEther(quorum)} (${quorumReached ? "✅ Met" : "❌ Not Met"})`);
      
      // If active, show time remaining
      if (state === 1n) { // Active
        const deadline = await governor.proposalDeadline(taskArgs.proposalid);
        const currentBlock = await ethers.provider.getBlockNumber();
        const blocksRemaining = Number(deadline) - currentBlock;
        console.log(`\n⏰ Voting ends in: ${blocksRemaining} blocks`);
      }
    } catch (error: any) {
      console.error(`\n❌ Error checking votes: ${error.message}`);
      throw error;
    }
  });

task("gov:debug-salt", "Debug salt calculation for a proposal")
  .addParam("proposalid", "The proposal ID to debug")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    // Validate inputs
    validateProposalId(taskArgs.proposalid);
    
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) {
      throw new Error("DAOGovernor not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) {
      throw new Error("Timelock not deployed. Please run deployment script first: npx hardhat run scripts/deploy-governance.ts");
    }
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    
    console.log(`\n🔧 SALT CALCULATION DEBUG\n${"=".repeat(50)}`);
    console.log(`Proposal ID: ${taskArgs.proposalid}`);
    
    try {
      // Get proposal details from events
      const filter = governor.filters.ProposalCreated();
      const events = await governor.queryFilter(filter);
      const event = events.find(e => e.args.proposalId.toString() === taskArgs.proposalid.toString());
      
      if (!event) {
        console.error("\n❌ Proposal not found in events.");
        return;
      }
      
      // Extract proposal details
      const targets = [...event.args[2]];
      const values = [...event.args[3]];
      const calldatas = [...event.args[5]];
      const description = event.args[8];
      
      console.log(`\n📋 Proposal Details:`);
      console.log(`   Description: ${description.slice(0, 60)}...`);
      console.log(`   Targets: ${targets}`);
      console.log(`   Values: ${values}`);
      console.log(`   Calldatas: ${calldatas.map(c => c.slice(0, 10) + "...")}`);
      
      // Calculate salt step by step
      console.log(`\n🧮 Salt Calculation Steps:`);
      console.log(`   1. Governor Address: ${governorAddress}`);
      
      const descriptionHash = ethers.id(description);
      console.log(`   2. Description Hash: ${descriptionHash}`);
      
      const governorBytes20 = ethers.zeroPadValue(governorAddress, 20);
      console.log(`   3. Governor as bytes20: ${governorBytes20}`);
      
      const governorBytes32 = ethers.zeroPadBytes(governorBytes20, 32);
      console.log(`   4. Governor padded to bytes32: ${governorBytes32}`);
      
      const salt = ethers.toBigInt(governorBytes32) ^ ethers.toBigInt(descriptionHash);
      console.log(`   5. XOR Result (as BigInt): ${salt}`);
      
      const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
      console.log(`   6. Final Salt (bytes32): ${saltBytes32}`);
      
      // Calculate operation ID
      const operationId = await timelock.hashOperationBatch(
        targets,
        values,
        calldatas,
        ethers.ZeroHash, // predecessor
        saltBytes32
      );
      console.log(`\n🔑 Operation ID: ${operationId}`);
      
      // Check if operation exists in timelock
      const timestamp = await timelock.getTimestamp(operationId);
      if (timestamp > 0n) {
        console.log(`\n✅ Operation found in timelock!`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Scheduled at: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
        
        const isReady = await timelock.isOperationReady(operationId);
        const isPending = await timelock.isOperationPending(operationId);
        const isDone = await timelock.isOperationDone(operationId);
        
        console.log(`\n📊 Operation Status:`);
        console.log(`   Pending: ${isPending ? "✅" : "❌"}`);
        console.log(`   Ready: ${isReady ? "✅" : "❌"}`);
        console.log(`   Done: ${isDone ? "✅" : "❌"}`);
        
        if (!isReady && isPending) {
          const minDelay = await timelock.getMinDelay();
          const readyTime = Number(timestamp) + Number(minDelay);
          const currentTime = Math.floor(Date.now() / 1000);
          const remainingTime = readyTime - currentTime;
          
          if (remainingTime > 0) {
            console.log(`\n⏳ Timelock Status:`);
            console.log(`   Ready in: ${remainingTime} seconds (${Math.ceil(remainingTime / 60)} minutes)`);
            console.log(`   Ready at: ${new Date(readyTime * 1000).toLocaleString()}`);
          }
        }
      } else {
        console.log(`\n❌ Operation NOT found in timelock!`);
        console.log(`   This means the proposal hasn't been queued yet.`);
        console.log(`   Queue it with: npx hardhat gov:queue --proposalid ${taskArgs.proposalid}`);
      }
      
      // Show the formula for reference
      console.log(`\n📚 Salt Formula Reference:`);
      console.log(`   salt = bytes20(governor) ^ keccak256(description)`);
      console.log(`\n   This is specific to GovernorTimelockControl contracts.`);
      console.log(`   The salt ensures the operation is unique to this governor.`);
      
    } catch (error: any) {
      console.error("\n❌ Error debugging salt:", error.message);
    }
  });