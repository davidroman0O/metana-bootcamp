const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying contracts with the account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());
  
  // Mainnet addresses (update for your target network)
  const CHAINLINK_VRF_COORDINATOR = "0x271682DEB8C4E0901D1a1550aD2e64D568E69909";
  const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef";
  const CHAINLINK_SUBSCRIPTION_ID = 1; // Update with your subscription ID
  const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const COMPOUND_CETH = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";
  const COMPOUND_COMPTROLLER = "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B";

  // Step 1: Deploy ChipToken
  console.log("\n📦 Deploying ChipToken...");
  const ChipToken = await ethers.getContractFactory("ChipToken");
  const chipToken = await upgrades.deployProxy(
    ChipToken,
    [deployer.address], // initialOwner
    {
      kind: 'uups',
      initializer: 'initialize'
    }
  );
  await chipToken.deployed();
  console.log("💎 ChipToken deployed to:", chipToken.address);

  // Step 2: Deploy DegenSlots
  console.log("\n🎰 Deploying DegenSlots...");
  const DegenSlots = await ethers.getContractFactory("DegenSlots");
  const degenSlots = await upgrades.deployProxy(
    DegenSlots,
    [
      CHAINLINK_VRF_COORDINATOR,
      CHAINLINK_KEY_HASH,
      CHAINLINK_SUBSCRIPTION_ID,
      ETH_USD_PRICE_FEED,
      COMPOUND_CETH,
      COMPOUND_COMPTROLLER,
      chipToken.address,
      deployer.address
    ],
    {
      kind: 'uups',
      initializer: 'initialize'
    }
  );
  await degenSlots.deployed();
  console.log("🎰 DegenSlots deployed to:", degenSlots.address);

  // Step 3: Transfer ChipToken ownership to DegenSlots
  console.log("\n🔄 Transferring ChipToken ownership to DegenSlots...");
  await chipToken.transferOwnership(degenSlots.address);
  console.log("✅ ChipToken ownership transferred");

  // Step 4: Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const chipBalance = await chipToken.balanceOf(deployer.address);
  const degenOwner = await degenSlots.owner();
  const chipOwner = await chipToken.owner();
  
  console.log("📊 Deployment Summary:");
  console.log("   💎 ChipToken:", chipToken.address);
  console.log("   🎰 DegenSlots:", degenSlots.address);
  console.log("   👑 DegenSlots Owner:", degenOwner);
  console.log("   👑 ChipToken Owner:", chipOwner);
  console.log("   💰 Deployer CHIP Balance:", chipBalance.toString());

  // Step 5: Fund with initial liquidity (optional)
  if (process.env.FUND_INITIAL_LIQUIDITY === "true") {
    console.log("\n💰 Funding with initial liquidity...");
    const fundAmount = ethers.utils.parseEther("10"); // 10 ETH
    await deployer.sendTransaction({
      to: degenSlots.address,
      value: fundAmount
    });
    console.log(`✅ Funded with ${ethers.utils.formatEther(fundAmount)} ETH`);
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Update Chainlink VRF subscription to add DegenSlots as consumer");
  console.log("2. Verify contracts on block explorer");
  console.log("3. Test the deployment with small transactions");
  
  return {
    chipToken: chipToken.address,
    degenSlots: degenSlots.address
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((addresses) => {
    console.log("\n📋 Contract Addresses:");
    console.log("ChipToken:", addresses.chipToken);
    console.log("DegenSlots:", addresses.degenSlots);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = main; 