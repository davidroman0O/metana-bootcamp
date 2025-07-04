const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🔄 Upgrading contracts with the account:", deployer.address);
  
  // Get the proxy addresses from previous deployment
  // You can get these from the deployment output or .openzeppelin folder
  const CHIP_TOKEN_PROXY = process.env.CHIP_TOKEN_PROXY;
  const DEGEN_SLOTS_PROXY = process.env.DEGEN_SLOTS_PROXY;
  
  if (!CHIP_TOKEN_PROXY || !DEGEN_SLOTS_PROXY) {
    console.error("❌ Please set CHIP_TOKEN_PROXY and DEGEN_SLOTS_PROXY environment variables");
    process.exit(1);
  }
  
  console.log("💎 ChipToken Proxy:", CHIP_TOKEN_PROXY);
  console.log("🎰 DegenSlots Proxy:", DEGEN_SLOTS_PROXY);

  try {
    // Upgrade ChipToken
    console.log("\n📦 Upgrading ChipToken...");
    const ChipTokenV2 = await ethers.getContractFactory("ChipToken");
    const chipTokenUpgraded = await upgrades.upgradeProxy(CHIP_TOKEN_PROXY, ChipTokenV2);
    await chipTokenUpgraded.deployed();
    console.log("✅ ChipToken upgraded successfully");

    // Upgrade DegenSlots
    console.log("\n🎰 Upgrading DegenSlots...");
    const DegenSlotsV2 = await ethers.getContractFactory("DegenSlots");
    const degenSlotsUpgraded = await upgrades.upgradeProxy(DEGEN_SLOTS_PROXY, DegenSlotsV2);
    await degenSlotsUpgraded.deployed();
    console.log("✅ DegenSlots upgraded successfully");

    // Verify the upgrades
    console.log("\n🔍 Verifying upgrades...");
    
    // Check that the contracts still work
    const chipName = await chipTokenUpgraded.name();
    const degenOwner = await degenSlotsUpgraded.owner();
    
    console.log("📊 Post-upgrade verification:");
    console.log("   💎 ChipToken name:", chipName);
    console.log("   👑 DegenSlots owner:", degenOwner);
    
    console.log("\n🎉 Upgrade completed successfully!");
    
    return {
      chipToken: CHIP_TOKEN_PROXY,
      degenSlots: DEGEN_SLOTS_PROXY
    };
    
  } catch (error) {
    console.error("❌ Upgrade failed:", error);
    throw error;
  }
}

// Usage example:
// CHIP_TOKEN_PROXY=0x... DEGEN_SLOTS_PROXY=0x... npx hardhat run scripts/upgrade.js --network mainnet

main()
  .then((addresses) => {
    console.log("\n📋 Upgraded Contract Addresses:");
    console.log("ChipToken:", addresses.chipToken);
    console.log("DegenSlots:", addresses.degenSlots);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Upgrade failed:");
    console.error(error);
    process.exit(1);
  }); 