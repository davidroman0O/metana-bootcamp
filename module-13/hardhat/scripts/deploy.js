const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  // First, compile contracts with new optimizer settings
  console.log("🔨 Compiling smart contracts with size optimization...");
  await hre.run("compile");
  console.log("✅ Smart contracts compiled successfully");

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

  // Step 1: Deploy PayoutTables System (Complete version)
  console.log("\n🎰 Deploying PayoutTables System (ALL tables)...");
  
  // Deploy all payout table contracts  
  console.log("Deploying PayoutTables3...");
  const PayoutTables3 = await ethers.getContractFactory("PayoutTables3");
  const payoutTables3 = await PayoutTables3.deploy();
  await payoutTables3.deployed();
  console.log("✅ PayoutTables3 deployed to:", payoutTables3.address);
  
  console.log("Deploying PayoutTables4...");
  const PayoutTables4 = await ethers.getContractFactory("PayoutTables4");
  const payoutTables4 = await PayoutTables4.deploy();
  await payoutTables4.deployed();
  console.log("✅ PayoutTables4 deployed to:", payoutTables4.address);
  
  console.log("Deploying PayoutTables5...");
  const PayoutTables5 = await ethers.getContractFactory("PayoutTables5");
  const payoutTables5 = await PayoutTables5.deploy();
  await payoutTables5.deployed();
  console.log("✅ PayoutTables5 deployed to:", payoutTables5.address);
  
  console.log("Deploying PayoutTables6...");
  const PayoutTables6 = await ethers.getContractFactory("PayoutTables6");
  const payoutTables6 = await PayoutTables6.deploy();
  await payoutTables6.deployed();
  console.log("✅ PayoutTables6 deployed to:", payoutTables6.address);
  
  console.log("Deploying PayoutTables7 chunks...");
  const payoutTables7Chunks = [];
  
  // Deploy all 8 PayoutTables7 chunks
  for (let i = 1; i <= 8; i++) {
    console.log(`Deploying PayoutTables7_Part${i}...`);
    const PayoutTables7_Part = await ethers.getContractFactory(`PayoutTables7_Part${i}`);
    const payoutTables7_Part = await PayoutTables7_Part.deploy();
    await payoutTables7_Part.deployed();
    payoutTables7Chunks.push(payoutTables7_Part.address);
    console.log(`✅ PayoutTables7_Part${i} deployed to:`, payoutTables7_Part.address);
  }
  
  console.log("Deploying PayoutTables7 router...");
  const PayoutTables7 = await ethers.getContractFactory("PayoutTables7");
  const payoutTables7 = await PayoutTables7.deploy(...payoutTables7Chunks);
  await payoutTables7.deployed();
  console.log("✅ PayoutTables7 router deployed to:", payoutTables7.address);
  
  // Deploy main PayoutTables API contract with all tables
  console.log("Deploying main PayoutTables API contract...");
  const PayoutTables = await ethers.getContractFactory("PayoutTables");
  const payoutTables = await PayoutTables.deploy(
    payoutTables3.address,    // 3-reel table
    payoutTables4.address,    // 4-reel table  
    payoutTables5.address,    // 5-reel table
    payoutTables6.address,    // 6-reel table
    payoutTables7.address     // 7-reel table (FULL CHUNKED SYSTEM!)
  );
  await payoutTables.deployed();
  console.log("✅ PayoutTables API deployed to:", payoutTables.address);
  console.log("🎉 ALL payout tables deployed with full 7-reel chunked system!");

  // Step 2: Deploy ChipToken
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

  // Step 3: Deploy DegenSlots with correct parameter order
  console.log("\n🎰 Deploying DegenSlots...");
  const DegenSlots = await ethers.getContractFactory("DegenSlots");
  const degenSlots = await upgrades.deployProxy(
    DegenSlots,
    [
      CHAINLINK_SUBSCRIPTION_ID,    // uint64 subscriptionId
      chipToken.address,            // address chipTokenAddress
      ETH_USD_PRICE_FEED,          // address ethUsdPriceFeedAddress  
      payoutTables.address,        // address payoutTablesAddress
      CHAINLINK_VRF_COORDINATOR,   // address vrfCoordinatorAddress
      CHAINLINK_KEY_HASH,          // bytes32 vrfKeyHash
      COMPOUND_CETH,               // address cEthAddress
      COMPOUND_COMPTROLLER,        // address comptrollerAddress
      deployer.address             // address initialOwner
    ],
    {
      kind: 'uups',
      initializer: 'initialize'
    }
  );
  await degenSlots.deployed();
  console.log("🎰 DegenSlots deployed to:", degenSlots.address);

  // Step 4: Transfer ChipToken ownership to DegenSlots
  console.log("\n🔄 Transferring ChipToken ownership to DegenSlots...");
  await chipToken.transferOwnership(degenSlots.address);
  console.log("✅ ChipToken ownership transferred");

  // Step 5: Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const chipBalance = await chipToken.balanceOf(deployer.address);
  const degenOwner = await degenSlots.owner();
  const chipOwner = await chipToken.owner();
  
  console.log("📊 Deployment Summary:");
  console.log("   🎰 PayoutTables:", payoutTables.address);
  console.log("   💎 ChipToken:", chipToken.address);
  console.log("   🎰 DegenSlots:", degenSlots.address);
  console.log("   🧩 PayoutTables7 Router:", payoutTables7.address);
  console.log("   👑 DegenSlots Owner:", degenOwner);
  console.log("   👑 ChipToken Owner:", chipOwner);
  console.log("   💰 Deployer CHIP Balance:", chipBalance.toString());
  console.log("   📊 PayoutTables7 Chunks: 8 contracts deployed");

  // Step 6: Fund with initial liquidity (optional)
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
    payoutTables: payoutTables.address,
    payoutTables7Router: payoutTables7.address,
    payoutTables7Chunks: payoutTables7Chunks,
    chipToken: chipToken.address,
    degenSlots: degenSlots.address
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((addresses) => {
    console.log("\n📋 Contract Addresses:");
    console.log("PayoutTables:", addresses.payoutTables);
    console.log("PayoutTables7 Router:", addresses.payoutTables7Router);
    console.log("PayoutTables7 Chunks:", addresses.payoutTables7Chunks);
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