const { ethers, upgrades, network, run } = require("hardhat");
const { getAddresses, saveAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
require('dotenv').config();

// Helper to get network-specific addresses
function getNetworkConfig(chainId) {
  const isLocal = chainId === 31337;
  
  // Validate Chainlink subscription ID for non-local networks
  if (!isLocal && !process.env.CHAINLINK_SUB_ID) {
    console.error("\n❌ CHAINLINK_SUB_ID environment variable is required for non-local networks!");
    console.error("\n📋 To get a Chainlink VRF subscription ID for Sepolia:");
    console.error("   1. Go to https://vrf.chain.link/");
    console.error("   2. Connect your wallet");
    console.error("   3. Switch to Sepolia network");
    console.error("   4. Click 'Create Subscription'");
    console.error("   5. Fund it with LINK tokens (minimum ~2 LINK recommended)");
    console.error("   6. Copy the subscription ID and add it to your .env file:");
    console.error("      CHAINLINK_SUB_ID=your_subscription_id_here");
    console.error("\n💡 You can get Sepolia LINK tokens from: https://faucets.chain.link/");
    process.exit(1);
  }
  
  return {
    vrfCoordinator: isLocal ? null : "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B", // Sepolia VRF v2.5 Coordinator
    keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", // VRF v2.5 key hash for Sepolia
    subscriptionId: isLocal ? 1 : ethers.BigNumber.from(process.env.CHAINLINK_SUB_ID),
    // Sepolia testnet addresses
    ethUsdPriceFeed: isLocal ? "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" : "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Sepolia ETH/USD
    linkUsdPriceFeed: isLocal ? "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c" : "0xc59E3633BAAC79493d908e63626716e204A45EdF", // Sepolia LINK/USD
    linkToken: isLocal ? "0x514910771AF9Ca656af840dff83E8264EcF986CA" : "0x779877A7B0D9E8603169DdbD7836e478b4624789", // Sepolia LINK
    uniswapRouter: isLocal ? "0xE592427A0AEce92De3Edee1F18E0157C05861564" : "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E", // Sepolia Uniswap V3 Router
    wethToken: isLocal ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Sepolia WETH
    isLocal,
  };
}

async function main() {
  console.log(`\n▶️  Deploying CasinoSlot contract on '${network.name}'`);
  console.log("------------------------------------------------------");
  
  // Compile contracts first
  console.log("\n📦 Compiling contracts...");
  await run("compile");
  console.log("   ✅ Compilation complete");
  
  const [deployer] = await ethers.getSigners();
  console.log("\n  > Deployer account:", deployer.address);
  console.log("  > Account balance:", (await deployer.getBalance()).toString());

  const chainId = network.config.chainId;
  const config = getNetworkConfig(chainId);
  
  // Display configuration for verification
  console.log("\n🔧 Network Configuration:");
  console.log(`  > Chain ID: ${chainId}`);
  console.log(`  > VRF Coordinator: ${config.vrfCoordinator || 'Mock (local)'}`);
  console.log(`  > Subscription ID: ${config.subscriptionId}`);
  console.log(`  > Key Hash: ${config.keyHash}`);

  // Get PayoutTables address
  const payoutAddresses = getAddresses(network.name, "payouts");
  if (!payoutAddresses || !payoutAddresses.payoutTablesAPI) {
    throw new Error("PayoutTables API address not found. Please run 01-deploy-payout-tables.js first.");
  }
  console.log("\n  > Using PayoutTables API from:", payoutAddresses.payoutTablesAPI);

  let vrfCoordinatorAddress = config.vrfCoordinator;
  if (config.isLocal) {
    console.log("\n  > Local network detected. Deploying MockVRFCoordinator...");
    const MockVRF = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVrf = await MockVRF.deploy();
    await mockVrf.deployed();
    vrfCoordinatorAddress = mockVrf.address;
    console.log("     ✅ MockVRFCoordinator deployed to:", vrfCoordinatorAddress);
  }

  console.log("\n  > Deploying CasinoSlot (UUPS Proxy)...");
  const CasinoSlot = await ethers.getContractFactory("CasinoSlot");
  const casinoSlot = await withRetry(async () => 
    upgrades.deployProxy(
      CasinoSlot,
      [
        config.subscriptionId,
        config.ethUsdPriceFeed,
        config.linkUsdPriceFeed,
        config.linkToken,
        payoutAddresses.payoutTablesAPI,
        vrfCoordinatorAddress,
        config.uniswapRouter,
        config.wethToken,
        config.keyHash,
        deployer.address
      ],
      {
        kind: 'uups',
        initializer: 'initialize'
      }
    )
  );
  await casinoSlot.deployed();
  
  const proxyAddress = casinoSlot.address;
  console.log("     ✅ CasinoSlot proxy deployed to:", proxyAddress);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("     ✅ CasinoSlot implementation deployed to:", implementationAddress);

  saveAddresses(network.name, "casino", {
    proxy: proxyAddress,
    implementation: implementationAddress,
    admin: deployer.address,
  });

  console.log("\n✅ CasinoSlot contract deployed successfully!");
  console.log(`\nNext steps:`);
  console.log(`1. Verify contracts: npx hardhat run scripts/deployment/03-verify-contracts.js --network ${network.name}`);
  console.log("------------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 