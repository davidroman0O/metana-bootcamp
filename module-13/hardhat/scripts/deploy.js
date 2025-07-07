const { ethers, upgrades, network, run } = require("hardhat");
const { getAddresses, saveAddresses, initAddressFile } = require("./utils/addresses");
const { withRetry } = require("./utils/retry");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log(`\n🚀 Starting local deployment on '${network.name}'`);
  console.log("=".repeat(60));
  
  // Compile contracts first
  console.log("\n📦 Compiling contracts...");
  await run("compile");
  console.log("   ✅ Compilation complete");
  
  const [deployer] = await ethers.getSigners();
  console.log("\n👤 Deployer Information:");
  console.log(`   Address: ${deployer.address}`);
  console.log(`   Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  const chainId = network.config.chainId || 31337; // Default to 31337 for localhost
  console.log(`   Chain ID: ${chainId}`);
  
  // Initialize fresh address file for localhost only if it doesn't exist
  const addressFile = path.join(__dirname, `../.addresses.${network.name}.json`);
  if (network.name === 'localhost' && !fs.existsSync(addressFile)) {
    initAddressFile(network.name);
  }
  
  // Network-specific configuration
  const config = {
    // Using mainnet fork addresses for price feeds (since we fork mainnet)
    ethUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD Chainlink mainnet
    isLocal: chainId === 31337 || network.name === 'localhost'
  };
  
  console.log("\n🔧 Network Configuration:");
  console.log(`   ETH/USD Price Feed: ${config.ethUsdPriceFeed}`);
  console.log(`   Local Development: ${config.isLocal}`);
  
  // Step 1: Deploy PayoutTables system
  console.log("\n" + "=".repeat(60));
  console.log("🎰 STEP 1: Deploying PayoutTables System");
  console.log("=".repeat(60));
  
  let payoutAddresses = getAddresses(network.name, "payouts") || {};
  
  // Check if payout tables actually exist on blockchain
  let payoutTablesExist = false;
  if (payoutAddresses.payoutTablesAPI) {
    const code = await ethers.provider.getCode(payoutAddresses.payoutTablesAPI);
    payoutTablesExist = code !== "0x";
    if (!payoutTablesExist) {
      console.log("   ⚠️  PayoutTables address found but contract doesn't exist on chain");
    }
  }
  
  if (!payoutAddresses.payoutTablesAPI || !payoutTablesExist) {
    console.log("\n🔨 PayoutTables not found, deploying complete system...");
    
    // Deploy all individual payout tables (3-6)
    console.log("   -> Deploying PayoutTables3...");
    const PayoutTables3 = await ethers.getContractFactory("PayoutTables3");
    const payoutTables3 = await withRetry(async () => await PayoutTables3.deploy());
    await payoutTables3.deployed();
    console.log(`   ✅ PayoutTables3: ${payoutTables3.address}`);
    
    console.log("   -> Deploying PayoutTables4...");
    const PayoutTables4 = await ethers.getContractFactory("PayoutTables4");
    const payoutTables4 = await withRetry(async () => await PayoutTables4.deploy());
    await payoutTables4.deployed();
    console.log(`   ✅ PayoutTables4: ${payoutTables4.address}`);
    
    console.log("   -> Deploying PayoutTables5...");
    const PayoutTables5 = await ethers.getContractFactory("PayoutTables5");
    const payoutTables5 = await withRetry(async () => await PayoutTables5.deploy());
    await payoutTables5.deployed();
    console.log(`   ✅ PayoutTables5: ${payoutTables5.address}`);
    
    console.log("   -> Deploying PayoutTables6...");
    const PayoutTables6 = await ethers.getContractFactory("PayoutTables6");
    const payoutTables6 = await withRetry(async () => await PayoutTables6.deploy());
    await payoutTables6.deployed();
    console.log(`   ✅ PayoutTables6: ${payoutTables6.address}`);
    
    // Deploy all 8 PayoutTables7 chunks
    console.log("\n   -> Deploying PayoutTables7 chunks (1-8)...");
    const payoutTables7Chunks = [];
    for (let i = 1; i <= 8; i++) {
      console.log(`   -> Deploying PayoutTables7_Part${i}...`);
      const ChunkFactory = await ethers.getContractFactory(`PayoutTables7_Part${i}`);
      const chunk = await withRetry(async () => await ChunkFactory.deploy());
      await chunk.deployed();
      console.log(`   ✅ PayoutTables7_Part${i}: ${chunk.address}`);
      payoutTables7Chunks.push(chunk.address);
    }
    
    // Deploy PayoutTables7 router with all chunks
    console.log("\n   -> Deploying PayoutTables7 router...");
    const PayoutTables7 = await ethers.getContractFactory("PayoutTables7");
    const payoutTables7 = await withRetry(async () => await PayoutTables7.deploy(...payoutTables7Chunks));
    await payoutTables7.deployed();
    console.log(`   ✅ PayoutTables7: ${payoutTables7.address}`);
    
    // Deploy main PayoutTables API with all tables
    console.log("\n   -> Deploying PayoutTables API...");
    const PayoutTables = await ethers.getContractFactory("PayoutTables");
    const payoutTables = await withRetry(async () => await PayoutTables.deploy(
      payoutTables3.address,
      payoutTables4.address,
      payoutTables5.address,
      payoutTables6.address,
      payoutTables7.address
    ));
    await payoutTables.deployed();
    console.log(`   ✅ PayoutTables API: ${payoutTables.address}`);
    
    // Save all addresses
    payoutAddresses = {
      payoutTables3: payoutTables3.address,
      payoutTables4: payoutTables4.address,
      payoutTables5: payoutTables5.address,
      payoutTables6: payoutTables6.address,
      payoutTables7Router: payoutTables7.address,
      payoutTablesAPI: payoutTables.address
    };
    
    // Save chunk addresses
    for (let i = 0; i < 8; i++) {
      payoutAddresses[`payoutTables7_Part${i + 1}`] = payoutTables7Chunks[i];
    }
    
    saveAddresses(network.name, "payouts", payoutAddresses);
  } else {
    console.log("   ⏭️  PayoutTables system already deployed");
    console.log(`   ✅ PayoutTables API: ${payoutAddresses.payoutTablesAPI}`);
  }
  
  // Step 2: Deploy Mock VRF Coordinator (for local testing)
  console.log("\n" + "=".repeat(60));
  console.log("🎲 STEP 2: Deploying Mock VRF Coordinator");
  console.log("=".repeat(60));
  
  let mockAddresses = getAddresses(network.name, "mock") || {};
  
  // Check if VRF coordinator actually exists on blockchain
  let vrfExists = false;
  if (mockAddresses.vrfCoordinator) {
    const code = await ethers.provider.getCode(mockAddresses.vrfCoordinator);
    vrfExists = code !== "0x";
    if (!vrfExists) {
      console.log("   ⚠️  VRF Coordinator address found but contract doesn't exist on chain");
    }
  }
  
  if (!mockAddresses.vrfCoordinator || !vrfExists) {
    console.log("\n🔨 Deploying Mock VRF Coordinator...");
    const MockVRFCoordinator = await ethers.getContractFactory("contracts/MockVRFCoordinator.sol:MockVRFCoordinator");
    const mockVRFCoordinator = await withRetry(async () => await MockVRFCoordinator.deploy());
    await mockVRFCoordinator.deployed();
    console.log(`   ✅ Mock VRF Coordinator: ${mockVRFCoordinator.address}`);
    
    // Save address
    mockAddresses = {
      vrfCoordinator: mockVRFCoordinator.address
    };
    saveAddresses(network.name, "mock", mockAddresses);
  } else {
    console.log("   ⏭️  Mock VRF Coordinator already deployed");
    console.log(`   ✅ Mock VRF Coordinator: ${mockAddresses.vrfCoordinator}`);
  }
  
  // Step 3: Deploy CasinoSlot (using CasinoSlotTest for local development)
  console.log("\n" + "=".repeat(60));
  console.log("🎰 STEP 3: Deploying CasinoSlot (Test Version)");
  console.log("=".repeat(60));
  
  let casinoAddresses = getAddresses(network.name, "casino") || {};
  
  // Check if contract actually exists on blockchain
  let contractExists = false;
  if (casinoAddresses.proxy) {
    const code = await ethers.provider.getCode(casinoAddresses.proxy);
    contractExists = code !== "0x";
    if (!contractExists) {
      console.log("   ⚠️  Proxy address found but contract doesn't exist on chain");
    }
  }
  
  if (!casinoAddresses.proxy || !contractExists) {
    console.log("\n🔨 Deploying CasinoSlotTest (UUPS Proxy)...");
    const CasinoSlotTest = await ethers.getContractFactory("CasinoSlotTest");
    const casinoSlot = await withRetry(async () => 
      upgrades.deployProxy(
        CasinoSlotTest,
        [
          config.ethUsdPriceFeed,           // address ethUsdPriceFeedAddress
          payoutAddresses.payoutTablesAPI,  // address payoutTablesAddress
          mockAddresses.vrfCoordinator,     // address wrapperAddress (mock VRF)
          deployer.address                  // address initialOwner
        ],
        {
          kind: 'uups',
          initializer: 'initialize'
        }
      )
    );
    await casinoSlot.deployed();
    
    const proxyAddress = casinoSlot.address;
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    
    console.log(`   ✅ CasinoSlotTest Proxy: ${proxyAddress}`);
    console.log(`   ✅ CasinoSlotTest Implementation: ${implementationAddress}`);
    
    // Save addresses
    casinoAddresses = {
      proxy: proxyAddress,
      implementation: implementationAddress,
      admin: deployer.address
    };
    saveAddresses(network.name, "casino", casinoAddresses);
  } else {
    console.log("   ⏭️  CasinoSlot already deployed");
    console.log(`   ✅ CasinoSlot Proxy: ${casinoAddresses.proxy}`);
  }
  
  // Step 4: Fund contract and test addresses
  console.log("\n" + "=".repeat(60));
  console.log("💰 STEP 4: Funding for Local Testing");
  console.log("=".repeat(60));
  
  const casinoContract = await ethers.getContractAt("CasinoSlotTest", casinoAddresses.proxy);
  
  // Fund contract with ETH for operations
  console.log("\n💰 Funding contract with ETH...");
  const fundingAmount = ethers.utils.parseEther("10");
  await deployer.sendTransaction({
    to: casinoAddresses.proxy,
    value: fundingAmount
  });
  console.log(`   ✅ Contract funded with ${ethers.utils.formatEther(fundingAmount)} ETH`);
  
  // Fund test address if it exists
  const testAddress = "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86";
  console.log(`\n💰 Funding test address: ${testAddress}`);
  try {
    await deployer.sendTransaction({
      to: testAddress,
      value: ethers.utils.parseEther("5")
    });
    console.log(`   ✅ Test address funded with 5 ETH`);
  } catch (error) {
    console.log(`   ⚠️  Could not fund test address: ${error.message}`);
  }
  
  // Step 5: Verify deployment
  console.log("\n" + "=".repeat(60));
  console.log("🔍 STEP 5: Verifying Deployment");
  console.log("=".repeat(60));
  
  try {
    const owner = await casinoContract.owner();
    const name = await casinoContract.name();
    const symbol = await casinoContract.symbol();
    const totalSupply = await casinoContract.totalSupply();
    const contractBalance = await ethers.provider.getBalance(casinoAddresses.proxy);
    const isTestContract = await casinoContract.isTestContract();
    
    console.log("\n📊 Contract Verification:");
    console.log(`   Owner: ${owner}`);
    console.log(`   Token Name: ${name}`);
    console.log(`   Token Symbol: ${symbol}`);
    console.log(`   Total Supply: ${ethers.utils.formatEther(totalSupply)} CHIPS`);
    console.log(`   Contract Balance: ${ethers.utils.formatEther(contractBalance)} ETH`);
    console.log(`   Is Test Contract: ${isTestContract}`);
    
    // Verify it's properly configured
    const gameStats = await casinoContract.getGameStats();
    console.log(`   Payout Tables: ${gameStats.payoutTablesAddress}`);
    console.log(`   House Edge: ${gameStats.houseEdgePercent / 100}%`);
    
  } catch (error) {
    console.error("   ❌ Verification failed:", error.message);
  }
  
  // Step 6: Save deployment summary
  console.log("\n💾 Saving deployment summary...");
  const deploymentData = {
    network: {
      name: network.name,
      chainId: chainId,
      timestamp: new Date().toISOString()
    },
    contracts: {
      CasinoSlotTest: {
        address: casinoAddresses.proxy,
        implementation: casinoAddresses.implementation,
        admin: casinoAddresses.admin,
        constructor: {
          vrfWrapper: mockAddresses.vrfCoordinator,
          ethUsdPriceFeed: config.ethUsdPriceFeed,
          payoutTablesAddress: payoutAddresses.payoutTablesAPI
        }
      },
      PayoutTables: {
        api: payoutAddresses.payoutTablesAPI,
        tables3: payoutAddresses.payoutTables3,
        tables4: payoutAddresses.payoutTables4,
        tables5: payoutAddresses.payoutTables5,
        tables6: payoutAddresses.payoutTables6,
        tables7Router: payoutAddresses.payoutTables7Router,
        tables7_Part1: payoutAddresses.payoutTables7_Part1,
        tables7_Part2: payoutAddresses.payoutTables7_Part2,
        tables7_Part3: payoutAddresses.payoutTables7_Part3,
        tables7_Part4: payoutAddresses.payoutTables7_Part4,
        tables7_Part5: payoutAddresses.payoutTables7_Part5,
        tables7_Part6: payoutAddresses.payoutTables7_Part6,
        tables7_Part7: payoutAddresses.payoutTables7_Part7,
        tables7_Part8: payoutAddresses.payoutTables7_Part8
      },
      MockVRFCoordinator: {
        address: mockAddresses.vrfCoordinator
      }
    },
    deployer: deployer.address,
    vrfVersion: "mock-coordinator",
    uniswapVersion: "not-applicable",
    swapMethod: "not-applicable",
    productionMode: false,
    lastUpdated: new Date().toISOString()
  };
  
  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `deployment-${chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log(`   ✅ Deployment summary saved to: ${path.basename(deploymentFile)}`);
  
  // Final summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  
  console.log("\n📋 Contract Addresses:");
  console.log(`   🎰 CasinoSlotTest: ${casinoAddresses.proxy}`);
  console.log(`   🎲 PayoutTables API: ${payoutAddresses.payoutTablesAPI}`);
  console.log(`   📊 PayoutTables (3-7): All deployed`);
  console.log(`   🎯 Mock VRF Coordinator: ${mockAddresses.vrfCoordinator}`);
  
  console.log("\n🛠️  Next Steps:");
  console.log("   1. 🧪 Start VRF fulfiller: npm run vrf:fulfiller");
  console.log("   2. 🎮 Test spins: npm run test-player");
  console.log("   3. 🔧 Run tests: npm test");
  console.log("   4. 📤 Extract addresses: npm run extract-addresses");
  
  console.log("\n💡 Development Tips:");
  console.log("   - Contract is funded with 10 ETH for operations");
  console.log("   - Test address has 5 ETH for testing");
  console.log("   - VRF fulfiller script handles random number generation");
  console.log("   - Use CasinoSlotTest contract for local development");
  
  return {
    casino: casinoAddresses.proxy,
    payoutTables: payoutAddresses.payoutTablesAPI,
    mockVRF: mockAddresses.vrfCoordinator
  };
}

main()
  .then(() => {
    console.log("\n✅ All deployments completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = main;