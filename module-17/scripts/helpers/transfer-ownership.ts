import { ethers, network } from "hardhat";
import { loadAddresses } from "./save-addresses";

async function main() {
  // Get the new admin address from command line
  const newAdmin = process.env.NEW_ADMIN;
  if (!newAdmin) {
    console.log("❌ Please provide NEW_ADMIN environment variable");
    console.log("Usage: NEW_ADMIN=0x... npx hardhat run scripts/helpers/transfer-ownership.ts");
    return;
  }

  console.log("🔄 Transferring ownership to:", newAdmin);
  console.log("");

  // Load addresses
  const addresses = loadAddresses(network.name);
  if (!addresses) {
    console.log("❌ No addresses found for current network");
    return;
  }

  const [currentAdmin] = await ethers.getSigners();
  console.log("Current admin:", currentAdmin.address);
  console.log("");

  // Transfer roles for each contract
  if (addresses.contracts.GovernanceToken) {
    console.log("📋 Transferring GovernanceToken admin roles...");
    const token = await ethers.getContractAt("GovernanceToken", addresses.contracts.GovernanceToken);
    
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await token.MINTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();

    // Grant roles to new admin
    await token.grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
    console.log("✅ Granted DEFAULT_ADMIN_ROLE");
    
    await token.grantRole(MINTER_ROLE, newAdmin);
    console.log("✅ Granted MINTER_ROLE");
    
    await token.grantRole(PAUSER_ROLE, newAdmin);
    console.log("✅ Granted PAUSER_ROLE");

    // Renounce roles from current admin
    await token.renounceRole(MINTER_ROLE, currentAdmin.address);
    console.log("✅ Renounced MINTER_ROLE");
    
    await token.renounceRole(PAUSER_ROLE, currentAdmin.address);
    console.log("✅ Renounced PAUSER_ROLE");
    
    // Admin role should be renounced last
    await token.renounceRole(DEFAULT_ADMIN_ROLE, currentAdmin.address);
    console.log("✅ Renounced DEFAULT_ADMIN_ROLE");
    console.log("");
  }

  if (addresses.contracts.Timelock) {
    console.log("📋 Transferring Timelock admin roles...");
    const timelock = await ethers.getContractAt("Timelock", addresses.contracts.Timelock);
    
    const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

    // Grant admin role to new admin
    await timelock.grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
    console.log("✅ Granted DEFAULT_ADMIN_ROLE to new admin");

    // Optionally grant admin role to timelock itself for self-administration
    const timelockAddress = await timelock.getAddress();
    const grantToSelf = process.env.SELF_ADMIN === "true";
    
    if (grantToSelf) {
      await timelock.grantRole(DEFAULT_ADMIN_ROLE, timelockAddress);
      console.log("✅ Granted DEFAULT_ADMIN_ROLE to timelock (self-administration)");
    }

    // Renounce admin role from current admin
    await timelock.renounceRole(DEFAULT_ADMIN_ROLE, currentAdmin.address);
    console.log("✅ Renounced DEFAULT_ADMIN_ROLE from current admin");
    console.log("");
  }

  console.log("✅ Ownership transfer complete!");
  console.log("");
  console.log("⚠️ IMPORTANT: Make sure the new admin has:");
  console.log("   1. Access to the private key for the new admin address");
  console.log("   2. Understanding of the governance system");
  console.log("   3. Backup procedures in place");
  console.log("");
  console.log("🔐 For full decentralization:");
  console.log("   - Transfer admin roles to a multisig wallet");
  console.log("   - Or renounce admin roles entirely (irreversible!)");
}

// Execute transfer
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });