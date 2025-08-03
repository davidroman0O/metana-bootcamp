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

task("encode:mint", "Encode a mint function call")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount of tokens to mint")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    const amount = ethers.parseEther(taskArgs.amount);
    const calldata = token.interface.encodeFunctionData("mint", [taskArgs.to, amount]);
    
    console.log(`📝 Encoded mint(${taskArgs.to}, ${taskArgs.amount} tokens)`);
    console.log(`📋 Calldata: ${calldata}`);
    
    return calldata;
  });

task("encode:transfer", "Encode a transfer function call")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount of tokens to transfer")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    const amount = ethers.parseEther(taskArgs.amount);
    const calldata = token.interface.encodeFunctionData("transfer", [taskArgs.to, amount]);
    
    console.log(`📝 Encoded transfer(${taskArgs.to}, ${taskArgs.amount} tokens)`);
    console.log(`📋 Calldata: ${calldata}`);
    
    return calldata;
  });

task("ops:schedule", "Schedule a timelock operation")
  .addParam("target", "Target contract (address or 'token'/'timelock'/'governor')")
  .addParam("value", "ETH value in wei", "0")
  .addParam("data", "Encoded function call")
  .addParam("delay", "Delay in seconds (minimum from timelock)")
  .addOptionalParam("salt", "Optional salt for operation ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress, signer);
    
    // Resolve target address
    let targetAddress = taskArgs.target;
    if (taskArgs.target.toLowerCase() === 'token') {
      targetAddress = getContractAddress("GovernanceToken", hre.network.name);
      if (!targetAddress) throw new Error("GovernanceToken not deployed");
    } else if (taskArgs.target.toLowerCase() === 'timelock') {
      targetAddress = timelockAddress;
    } else if (taskArgs.target.toLowerCase() === 'governor') {
      targetAddress = getContractAddress("DAOGovernor", hre.network.name);
      if (!targetAddress) throw new Error("DAOGovernor not deployed");
    } else if (!ethers.isAddress(taskArgs.target)) {
      throw new Error("Target must be a valid address or 'token'/'timelock'/'governor'");
    }
    
    const salt = taskArgs.salt || ethers.randomBytes(32);
    const predecessor = ethers.ZeroHash;
    
    console.log(`\n⏰ Scheduling timelock operation...`);
    console.log(`   Target: ${targetAddress}`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the schedule transaction on your Ledger device");
      }
      
      const tx = await timelock.schedule(
        targetAddress,
        taskArgs.value,
        taskArgs.data,
        predecessor,
        salt,
        taskArgs.delay
      );
      
      console.log(`\n⏳ Schedule transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log: any) => timelock.interface.parseLog(log))
      .find((log: any) => log?.name === "CallScheduled");
    
    const operationId = event?.args?.id;
    const readyTime = new Date(Date.now() + parseInt(taskArgs.delay) * 1000);
    
      console.log(`\n✅ Operation scheduled!`);
      console.log(`📋 Operation ID: ${operationId}`);
      console.log(`⏰ Ready at: ${readyTime.toLocaleString()}`);
      
      return { operationId, salt };
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error scheduling operation:", error.message);
      }
      throw error;
    }
  });

task("ops:execute", "Execute a scheduled timelock operation")
  .addParam("target", "Target contract (address or 'token'/'timelock'/'governor')")
  .addParam("value", "ETH value in wei", "0")
  .addParam("data", "Encoded function call")
  .addParam("salt", "Salt used when scheduling")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress, signer);
    
    // Resolve target address
    let targetAddress = taskArgs.target;
    if (taskArgs.target.toLowerCase() === 'token') {
      targetAddress = getContractAddress("GovernanceToken", hre.network.name);
      if (!targetAddress) throw new Error("GovernanceToken not deployed");
    } else if (taskArgs.target.toLowerCase() === 'timelock') {
      targetAddress = timelockAddress;
    } else if (taskArgs.target.toLowerCase() === 'governor') {
      targetAddress = getContractAddress("DAOGovernor", hre.network.name);
      if (!targetAddress) throw new Error("DAOGovernor not deployed");
    } else if (!ethers.isAddress(taskArgs.target)) {
      throw new Error("Target must be a valid address or 'token'/'timelock'/'governor'");
    }
    
    const predecessor = ethers.ZeroHash;
    
    // Check if operation is ready
    const operationId = await timelock.hashOperation(
      targetAddress,
      taskArgs.value,
      taskArgs.data,
      predecessor,
      taskArgs.salt
    );
    
    const isReady = await timelock.isOperationReady(operationId);
    if (!isReady) {
      throw new Error("Operation not ready for execution");
    }
    
    console.log(`\n🚀 Executing timelock operation...`);
    console.log(`   Target: ${targetAddress}`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the execution transaction on your Ledger device");
      }
      
      const tx = await timelock.execute(
        targetAddress,
        taskArgs.value,
        taskArgs.data,
        predecessor,
        taskArgs.salt
      );
      
      console.log(`\n⏳ Execution transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Operation executed successfully!`);
      console.log(`📋 Operation ID: ${operationId}`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error executing operation:", error.message);
      }
      throw error;
    }
  });

task("ops:cancel", "Cancel a scheduled timelock operation")
  .addParam("operationid", "The operation ID to cancel")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress, signer);
    
    console.log(`\n❌ Cancelling operation ${taskArgs.operationid}...`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the cancel transaction on your Ledger device");
      }
      
      const tx = await timelock.cancel(taskArgs.operationid);
      
      console.log(`\n⏳ Cancel transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Operation cancelled!`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error cancelling operation:", error.message);
      }
      throw error;
    }
  });

task("ops:status", "Check status of timelock operations")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    
    console.log(`\n⏰ TIMELOCK STATUS\n${"=".repeat(50)}`);
    
    // Get basic info
    const minDelay = await timelock.getMinDelay();
    console.log(`\n📋 Configuration:`);
    console.log(`   Min Delay: ${Number(minDelay) / 3600} hours`);
    console.log(`   Contract Address: ${timelockAddress}`);
    
    // Get roles
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
    const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
    
    console.log(`\n🔐 Roles:`);
    console.log(`   PROPOSER_ROLE: ${PROPOSER_ROLE}`);
    console.log(`   EXECUTOR_ROLE: ${EXECUTOR_ROLE}`);
    console.log(`   CANCELLER_ROLE: ${CANCELLER_ROLE}`);
    console.log(`   DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);
  });

task("ops:batch-schedule", "Schedule multiple operations as a batch")
  .addParam("targets", "Comma-separated target addresses")
  .addParam("values", "Comma-separated ETH values in wei")
  .addParam("datas", "Comma-separated encoded function calls")
  .addParam("delay", "Delay in seconds")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress, signer);
    
    // Parse and resolve targets
    const targetInputs = taskArgs.targets.split(",");
    const targets = targetInputs.map((target: string) => {
      const trimmedTarget = target.trim();
      if (trimmedTarget.toLowerCase() === 'token') {
        const addr = getContractAddress("GovernanceToken", hre.network.name);
        if (!addr) throw new Error("GovernanceToken not deployed");
        return addr;
      } else if (trimmedTarget.toLowerCase() === 'timelock') {
        return timelockAddress;
      } else if (trimmedTarget.toLowerCase() === 'governor') {
        const addr = getContractAddress("DAOGovernor", hre.network.name);
        if (!addr) throw new Error("DAOGovernor not deployed");
        return addr;
      } else if (ethers.isAddress(trimmedTarget)) {
        return trimmedTarget;
      } else {
        throw new Error(`Invalid target: ${trimmedTarget}. Must be a valid address or 'token'/'timelock'/'governor'`);
      }
    });
    
    const values = taskArgs.values.split(",").map((v: string) => BigInt(v));
    const datas = taskArgs.datas.split(",");
    const salt = ethers.randomBytes(32);
    const predecessor = ethers.ZeroHash;
    
    if (targets.length !== values.length || targets.length !== datas.length) {
      throw new Error("Targets, values, and datas must have the same length");
    }
    
    console.log(`\n⏰ Scheduling batch operation with ${targets.length} actions...`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the batch schedule transaction on your Ledger device");
      }
      
      const tx = await timelock.scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        taskArgs.delay
      );
      
      console.log(`\n⏳ Batch schedule transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      console.log(`\n✅ Batch operation scheduled!`);
      console.log(`📋 Salt: ${ethers.hexlify(salt)}`);
      
      const readyTime = new Date(Date.now() + parseInt(taskArgs.delay) * 1000);
      console.log(`⏰ Ready at: ${readyTime.toLocaleString()}`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error scheduling batch:", error.message);
      }
      throw error;
    }
  });

task("ops:role-info", "Get role member information")
  .addParam("role", "Role to check (proposer, executor, canceller, admin)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress);
    
    let roleHash: string;
    switch (taskArgs.role.toLowerCase()) {
      case "proposer":
        roleHash = await timelock.PROPOSER_ROLE();
        break;
      case "executor":
        roleHash = await timelock.EXECUTOR_ROLE();
        break;
      case "canceller":
        roleHash = await timelock.CANCELLER_ROLE();
        break;
      case "admin":
        roleHash = await timelock.DEFAULT_ADMIN_ROLE();
        break;
      default:
        throw new Error("Invalid role. Use: proposer, executor, canceller, or admin");
    }
    
    console.log(`\n👥 ${taskArgs.role.toUpperCase()} ROLE\n${"=".repeat(50)}`);
    console.log(`Role Hash: ${roleHash}`);
    
    // AccessControl doesn't have getRoleMemberCount, we need to check via events
    const filter = timelock.filters.RoleGranted(roleHash);
    const grantEvents = await timelock.queryFilter(filter);
    const revokeFilter = timelock.filters.RoleRevoked(roleHash);
    const revokeEvents = await timelock.queryFilter(revokeFilter);
    
    // Build current member set
    const members = new Set<string>();
    for (const event of grantEvents) {
      members.add(event.args.account);
    }
    for (const event of revokeEvents) {
      members.delete(event.args.account);
    }
    
    console.log(`\nCurrent Members (${members.size}):`);
    let i = 1;
    for (const member of members) {
      console.log(`  ${i}. ${member}`);
      i++;
    }
  });

task("ops:grant-role", "Grant a role to an address")
  .addParam("role", "Role to grant (proposer, executor, canceller)")
  .addParam("account", "Address to grant role to")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const timelockAddress = getContractAddress("Timelock", hre.network.name);
    if (!timelockAddress) throw new Error("Timelock not deployed");
    const timelock = await ethers.getContractAt("Timelock", timelockAddress, signer);
    
    let roleHash: string;
    switch (taskArgs.role.toLowerCase()) {
      case "proposer":
        roleHash = await timelock.PROPOSER_ROLE();
        break;
      case "executor":
        roleHash = await timelock.EXECUTOR_ROLE();
        break;
      case "canceller":
        roleHash = await timelock.CANCELLER_ROLE();
        break;
      default:
        throw new Error("Invalid role. Use: proposer, executor, or canceller");
    }
    
    console.log(`\n🔑 Granting ${taskArgs.role} role to ${taskArgs.account}...`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the grant role transaction on your Ledger device");
      }
      
      const tx = await timelock.grantRole(roleHash, taskArgs.account);
      
      console.log(`\n⏳ Grant role transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      const receipt = await tx.wait();
      
      const event = receipt?.logs
        .map((log: any) => timelock.interface.parseLog(log))
        .find((log: any) => log?.name === "RoleGranted");
      
      if (event) {
        console.log(`\n✅ Role granted successfully!`);
        console.log(`   Role: ${taskArgs.role} (${roleHash})`);
        console.log(`   Account: ${taskArgs.account}`);
        console.log(`   Granted by: ${event.args.sender}`);
      }
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error granting role:", error.message);
      }
      throw error;
    }
  });