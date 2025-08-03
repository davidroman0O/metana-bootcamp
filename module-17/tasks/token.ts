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

task("token:mint", "Mint new tokens")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount of tokens (in ETH units)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress, signer);
    
    const amount = ethers.parseEther(taskArgs.amount);
    
    console.log(`\n🪙 Minting ${taskArgs.amount} tokens to ${taskArgs.to}...`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the mint transaction on your Ledger device");
      }
      
      const tx = await token.mint(taskArgs.to, amount);
      
      console.log(`\n⏳ Mint transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
    
    const balance = await token.balanceOf(taskArgs.to);
      console.log(`\n✅ Minting complete!`);
      console.log(`📊 New balance: ${ethers.formatEther(balance)} tokens`);
      
      // Check if they need to delegate
      const votes = await token.getVotes(taskArgs.to);
      if (votes === 0n) {
        console.log(`\n⚠️  Note: ${taskArgs.to} has not delegated their voting power yet.`);
        console.log(`   They need to delegate (even to themselves) to participate in governance.`);
      }
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error minting tokens:", error.message);
      }
      throw error;
    }
  });

task("token:checkpoint", "View token checkpoint data")
  .addParam("account", "Account address to check")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    console.log(`📊 Checking voting power history for ${taskArgs.account}...`);
    
    const currentVotes = await token.getVotes(taskArgs.account);
    const currentBalance = await token.balanceOf(taskArgs.account);
    
    console.log(`\n📦 Current State:`);
    console.log(`   Balance: ${ethers.formatEther(currentBalance)} tokens`);
    console.log(`   Voting Power: ${ethers.formatEther(currentVotes)} votes`);
    
    // Check past votes at a recent block
    const currentBlock = await ethers.provider.getBlockNumber();
    if (currentBlock > 0) {
      const pastBlock = currentBlock - 1;
      const pastVotes = await token.getPastVotes(taskArgs.account, pastBlock);
      console.log(`\n🕰️ Past Voting Power (Block ${pastBlock}): ${ethers.formatEther(pastVotes)} votes`);
    }
  });

task("token:holders", "List top token holders")
  .addOptionalParam("limit", "Number of holders to show", "10")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    // Get Transfer events to find all holders
    const filter = token.filters.Transfer();
    const events = await token.queryFilter(filter);
    
    // Build holder set
    const holders = new Set<string>();
    for (const event of events) {
      if (event.args.to !== ethers.ZeroAddress) {
        holders.add(event.args.to);
      }
    }
    
    // Get balances
    const balances = await Promise.all(
      Array.from(holders).map(async (holder) => ({
        address: holder,
        balance: await token.balanceOf(holder),
        votes: await token.getVotes(holder)
      }))
    );
    
    // Sort by balance and filter out zero balances
    const topHolders = balances
      .filter(h => h.balance > 0n)
      .sort((a, b) => (b.balance > a.balance ? 1 : -1))
      .slice(0, parseInt(taskArgs.limit));
    
    console.log(`\n💰 TOP ${taskArgs.limit} TOKEN HOLDERS\n${"=".repeat(50)}`);
    
    for (const [index, holder] of topHolders.entries()) {
      console.log(`\n${index + 1}. ${holder.address}`);
      console.log(`   Balance: ${ethers.formatEther(holder.balance)} tokens`);
      console.log(`   Voting Power: ${ethers.formatEther(holder.votes)} votes`);
    }
  });

task("token:info", "Get comprehensive token information")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    console.log(`\n🪙 TOKEN INFORMATION\n${"=".repeat(50)}`);
    
    // Basic info
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    
    console.log(`\n📋 Basic Info:`);
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)}`);
    console.log(`   Contract Address: ${tokenAddress}`);
    
    // Roles
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await token.MINTER_ROLE();
    // Note: GovernanceToken doesn't have SNAPSHOT_ROLE
    
    console.log(`\n🔐 Roles:`);
    console.log(`   DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);
    console.log(`   MINTER_ROLE: ${MINTER_ROLE}`);
    // console.log(`   SNAPSHOT_ROLE: Not implemented`);
    
    // Get current signer info
    const [signer] = await ethers.getSigners();
    const balance = await token.balanceOf(signer.address);
    const votes = await token.getVotes(signer.address);
    
    console.log(`\n👤 Your Account:`);
    console.log(`   Address: ${signer.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} tokens`);
    console.log(`   Voting Power: ${ethers.formatEther(votes)} votes`);
  });

task("token:transfer", "Transfer tokens to another address")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount of tokens (in ETH units)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const { signer, isLedger } = await getSignerWithInfo(hre);
    
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress, signer);
    
    const amount = ethers.parseEther(taskArgs.amount);
    const balanceBefore = await token.balanceOf(signer.address);
    
    if (balanceBefore < amount) {
      throw new Error(`Insufficient balance. You have ${ethers.formatEther(balanceBefore)} tokens`);
    }
    
    console.log(`\n💸 Transferring ${taskArgs.amount} tokens to ${taskArgs.to}...`);
    
    try {
      if (isLedger) {
        console.log("\n📱 Please approve the transfer transaction on your Ledger device");
      }
      
      const tx = await token.transfer(taskArgs.to, amount);
      
      console.log(`\n⏳ Transfer transaction submitted: ${tx.hash}`);
      console.log("   Waiting for confirmation...");
      
      await tx.wait();
      
      const balanceAfter = await token.balanceOf(signer.address);
      const recipientBalance = await token.balanceOf(taskArgs.to);
      
      console.log(`\n✅ Transfer complete!`);
      console.log(`📊 Your new balance: ${ethers.formatEther(balanceAfter)} tokens`);
      console.log(`📊 Recipient balance: ${ethers.formatEther(recipientBalance)} tokens`);
    } catch (error: any) {
      if (isLedger && error.message?.includes("denied")) {
        console.error("\n❌ Transaction rejected on Ledger device");
      } else {
        console.error("\n❌ Error transferring tokens:", error.message);
      }
      throw error;
    }
  });

task("token:balance", "Check token balance of an address")
  .addParam("address", "Address to check balance for")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const tokenAddress = getContractAddress("GovernanceToken", hre.network.name);
    if (!tokenAddress) throw new Error("GovernanceToken not deployed");
    const token = await ethers.getContractAt("GovernanceToken", tokenAddress);
    
    const balance = await token.balanceOf(taskArgs.address);
    const votes = await token.getVotes(taskArgs.address);
    
    console.log(`\n💰 Token Balance for ${taskArgs.address}:`);
    console.log(`   Balance: ${ethers.formatEther(balance)} tokens`);
    console.log(`   Voting Power: ${ethers.formatEther(votes)} votes`);
    
    if (balance > 0n && votes === 0n) {
      console.log(`\n⚠️  Note: This address has tokens but no voting power.`);
      console.log(`   They need to delegate (even to themselves) to participate in governance.`);
    }
  });