import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("mine", "Mine a specified number of blocks")
  .addPositionalParam("blocks", "Number of blocks to mine")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const blocks = parseInt(taskArgs.blocks);
    console.log(`⛏️  Mining ${blocks} blocks...`);
    
    for (let i = 0; i < blocks; i++) {
      await hre.network.provider.send("evm_mine");
      if ((i + 1) % 10 === 0 && blocks > 10) {
        console.log(`   Mined ${i + 1}/${blocks} blocks...`);
      }
    }
    
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log(`✅ Current block number: ${blockNumber}`);
  });

task("time:increase", "Increase blockchain time")
  .addParam("seconds", "Number of seconds to increase")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const seconds = parseInt(taskArgs.seconds);
    console.log(`⏰ Increasing time by ${seconds} seconds...`);
    
    await hre.network.provider.send("evm_increaseTime", [seconds]);
    await hre.network.provider.send("evm_mine"); // Mine a block to apply the time change
    
    const block = await hre.ethers.provider.getBlock("latest");
    const newTime = new Date((block?.timestamp || 0) * 1000);
    console.log(`✅ New blockchain time: ${newTime.toLocaleString()}`);
  });

task("time:increaseTo", "Increase blockchain time to a specific timestamp")
  .addParam("timestamp", "Target timestamp (in seconds)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const targetTimestamp = parseInt(taskArgs.timestamp);
    const block = await hre.ethers.provider.getBlock("latest");
    const currentTimestamp = block?.timestamp || 0;
    
    if (targetTimestamp <= currentTimestamp) {
      console.log("❌ Target timestamp is in the past!");
      return;
    }
    
    const secondsToIncrease = targetTimestamp - currentTimestamp;
    console.log(`⏰ Increasing time to timestamp ${targetTimestamp}...`);
    console.log(`   (advancing ${secondsToIncrease} seconds)`);
    
    await hre.network.provider.send("evm_increaseTime", [secondsToIncrease]);
    await hre.network.provider.send("evm_mine");
    
    const newBlock = await hre.ethers.provider.getBlock("latest");
    const newTime = new Date((newBlock?.timestamp || 0) * 1000);
    console.log(`✅ New blockchain time: ${newTime.toLocaleString()}`);
  });

task("block:number", "Get current block number")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const block = await hre.ethers.provider.getBlock("latest");
    const timestamp = new Date((block?.timestamp || 0) * 1000);
    
    console.log(`📊 Current State:`);
    console.log(`   Block Number: ${blockNumber}`);
    console.log(`   Block Time: ${timestamp.toLocaleString()}`);
    
    return blockNumber;
  });

task("snapshot", "Create a snapshot of the blockchain state")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const snapshotId = await hre.network.provider.send("evm_snapshot");
    console.log(`📸 Snapshot created with ID: ${snapshotId}`);
    return snapshotId;
  });

task("revert", "Revert to a snapshot")
  .addParam("id", "Snapshot ID to revert to")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const success = await hre.network.provider.send("evm_revert", [taskArgs.id]);
    if (success) {
      console.log(`✅ Reverted to snapshot ${taskArgs.id}`);
    } else {
      console.log(`❌ Failed to revert to snapshot ${taskArgs.id}`);
    }
  });

// Helper task to advance to end of voting period
task("gov:advance-voting", "Advance blocks to end voting period for a proposal")
  .addParam("proposalid", "The proposal ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const governorAddress = getContractAddress("DAOGovernor", hre.network.name);
    if (!governorAddress) throw new Error("DAOGovernor not deployed");
    const governor = await ethers.getContractAt("DAOGovernor", governorAddress);
    
    try {
      const deadline = await governor.proposalDeadline(taskArgs.proposalid);
      const currentBlock = await ethers.provider.getBlockNumber();
      const blocksToMine = Number(deadline) - currentBlock + 1;
      
      if (blocksToMine > 0) {
        console.log(`⏳ Advancing to end of voting period...`);
        console.log(`   Current block: ${currentBlock}`);
        console.log(`   Voting ends at: ${deadline}`);
        console.log(`   Mining ${blocksToMine} blocks...`);
        
        // Mine in batches for large numbers
        const batchSize = 100;
        for (let i = 0; i < blocksToMine; i += batchSize) {
          const batch = Math.min(batchSize, blocksToMine - i);
          for (let j = 0; j < batch; j++) {
            await hre.network.provider.send("evm_mine");
          }
          if (blocksToMine > batchSize) {
            console.log(`   Mined ${Math.min(i + batchSize, blocksToMine)}/${blocksToMine} blocks...`);
          }
        }
        
        console.log(`✅ Advanced to block ${await ethers.provider.getBlockNumber()}`);
      } else {
        console.log(`✅ Already past voting deadline`);
      }
      
      const state = await governor.state(taskArgs.proposalid);
      const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      console.log(`📊 Proposal state: ${states[Number(state)]}`);
    } catch (error) {
      console.error("Error checking proposal:", error);
    }
  });

// Import the helper function
import { getContractAddress } from "../scripts/helpers/save-addresses";

export {};