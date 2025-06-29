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
  
  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  
  // Configure Chainlink addresses based on network
  let CHAINLINK_VRF_COORDINATOR, CHAINLINK_KEY_HASH, CHAINLINK_SUBSCRIPTION_ID, ETH_USD_PRICE_FEED;
  let LINK_USD_PRICE_FEED, LINK_TOKEN, UNISWAP_V3_ROUTER, WETH_TOKEN;
  
  if (network.chainId === 31337) {
    // Local development - use mocks for VRF but real mainnet addresses for DeFi (since we fork mainnet)
    console.log("🏗️  Local development detected - deploying mocks...");
    
    // Deploy MockVRFCoordinator first
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();
    
    CHAINLINK_VRF_COORDINATOR = mockVRFCoordinator.address;
    CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"; // Dummy hash
    CHAINLINK_SUBSCRIPTION_ID = 1; // Dummy ID
    
    // Use real mainnet addresses since we're forking mainnet (for dynamic pricing)
    ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";  // ETH/USD Chainlink
    LINK_USD_PRICE_FEED = "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c"; // LINK/USD Chainlink
    LINK_TOKEN = "0x514910771AF9Ca656af840dff83E8264EcF986CA";          // LINK token
    UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";   // Uniswap V3 router
    WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";        // WETH token
    
    console.log(`✅ MockVRFCoordinator deployed: ${CHAINLINK_VRF_COORDINATOR}`);
  } else {
    // Mainnet/testnet addresses
    CHAINLINK_VRF_COORDINATOR = "0x271682DEB8C4E0901D1a1550aD2e64D568E69909";
    CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef";
    CHAINLINK_SUBSCRIPTION_ID = 1; // Update with your subscription ID
    ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    LINK_USD_PRICE_FEED = "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c";
    LINK_TOKEN = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
    UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
    WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  }

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

  // Step 2: Deploy CasinoSlot (which is now both casino AND token)
  console.log("\n🎰 Deploying CasinoSlot Casino-Token...");
  const CasinoSlot = await ethers.getContractFactory("CasinoSlot");
  const casinoSlot = await upgrades.deployProxy(
    CasinoSlot,
    [
      CHAINLINK_SUBSCRIPTION_ID,    // uint64 subscriptionId
      ETH_USD_PRICE_FEED,          // address ethUsdPriceFeedAddress  
      LINK_USD_PRICE_FEED,         // address linkUsdPriceFeedAddress
      LINK_TOKEN,                  // address linkTokenAddress
      payoutTables.address,        // address payoutTablesAddress
      CHAINLINK_VRF_COORDINATOR,   // address vrfCoordinatorAddress
      UNISWAP_V3_ROUTER,          // address uniswapRouterAddress
      WETH_TOKEN,                 // address wethTokenAddress
      CHAINLINK_KEY_HASH,         // bytes32 vrfKeyHash
      deployer.address            // address initialOwner
    ],
    {
      kind: 'uups',
      initializer: 'initialize'
    }
  );
  await casinoSlot.deployed();
  console.log("🎰 CasinoSlot Casino-Token deployed to:", casinoSlot.address);

  // Step 3: Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const casinoOwner = await casinoSlot.owner();
  const tokenName = await casinoSlot.name();
  const tokenSymbol = await casinoSlot.symbol();
  const totalSupply = await casinoSlot.totalSupply();
  
  console.log("📊 Deployment Summary:");
  console.log("   🎰 PayoutTables:", payoutTables.address);
  console.log("   🎰 CasinoSlot Casino-Token:", casinoSlot.address);
  console.log("   🧩 PayoutTables7 Router:", payoutTables7.address);
  console.log("   👑 CasinoSlot Owner:", casinoOwner);
  console.log("   🪙 Token Name:", tokenName);
  console.log("   🪙 Token Symbol:", tokenSymbol);
  console.log("   💰 Total CHIPS Supply:", ethers.utils.formatEther(totalSupply), "CHIPS");
  console.log("   📊 PayoutTables7 Chunks: 8 contracts deployed");
  console.log("   🔗 VRF Coordinator:", CHAINLINK_VRF_COORDINATOR);
  console.log("   💱 ETH/USD Price Feed:", ETH_USD_PRICE_FEED);
  console.log("   💱 LINK/USD Price Feed:", LINK_USD_PRICE_FEED);
  console.log("   🔗 LINK Token:", LINK_TOKEN);
  console.log("   🦄 Uniswap V3 Router:", UNISWAP_V3_ROUTER);
  console.log("   💧 WETH Token:", WETH_TOKEN);

  // Step 6: Fund with initial liquidity (optional)
  if (process.env.FUND_INITIAL_LIQUIDITY === "true") {
    console.log("\n💰 Funding with initial liquidity...");
    const fundAmount = ethers.utils.parseEther("10"); // 10 ETH
    await deployer.sendTransaction({
      to: casinoSlot.address,
      value: fundAmount
    });
    console.log(`✅ Funded with ${ethers.utils.formatEther(fundAmount)} ETH`);
  }

  // Step 6a: Auto-fund for local development (Hardhat networks)
  if (network.chainId === 31337) {
    console.log("\n🏗️  Local Hardhat development detected - Auto-funding for testing...");
    
    // Get development accounts (hardhat provides 20 accounts with 10,000 ETH each)
    const accounts = await ethers.getSigners();
    const lastDevAccount = accounts[19]; // Use the last account (#19)
    
    console.log(`💳 Using dev account ${lastDevAccount.address} for funding`);
    console.log(`💰 Dev account balance: ${ethers.utils.formatEther(await lastDevAccount.getBalance())} ETH`);
    
    console.log("\n🎲 Local VRF setup complete using MockVRFCoordinator");
    console.log("   📝 Mock VRF coordinator deployed at contract initialization");
    console.log("   🧪 Use the vrf-fulfiller.js script to automatically fulfill VRF requests");
    console.log("   💡 Tip: Run 'npm run vrf-fulfiller' to auto-fulfill VRF requests");
    
    // Transfer 30 ETH to deployer for operational funds
    console.log("🚀 Transferring 30 ETH to deployer for operational funds...");
    await lastDevAccount.sendTransaction({
      to: deployer.address,
      value: ethers.utils.parseEther("30")
    });
    console.log(`✅ Deployer funded with 30 ETH`);
    
    // Send 10 ETH to contract pool for realistic testing
    console.log("🏦 Funding contract pool with 10 ETH for realistic testing...");
    await lastDevAccount.sendTransaction({
      to: casinoSlot.address,
      value: ethers.utils.parseEther("10")
    });
    console.log(`✅ Contract pool funded with 10 ETH`);
    
    // Fund specific test address with ETH for testing
    const testAddress = "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86";
    console.log(`💰 Funding test address ${testAddress} with 5 ETH...`);
    await lastDevAccount.sendTransaction({
      to: testAddress,
      value: ethers.utils.parseEther("5")
    });
    console.log(`✅ Test address funded with 5 ETH`);
    
    // Verify balances
    const deployerBalance = await deployer.getBalance();
    const contractBalance = await ethers.provider.getBalance(casinoSlot.address);
    const testAddressBalance = await ethers.provider.getBalance(testAddress);
    console.log(`📊 Final balances:`);
    console.log(`   💰 Deployer: ${ethers.utils.formatEther(deployerBalance)} ETH`);
    console.log(`   🏦 Contract Pool: ${ethers.utils.formatEther(contractBalance)} ETH`);
    console.log(`   🧪 Test Address: ${ethers.utils.formatEther(testAddressBalance)} ETH`);
    console.log(`   💎 Pool Value: ~$${(parseFloat(ethers.utils.formatEther(contractBalance)) * 1834.80).toFixed(2)}`);
  }

  console.log("\n🎉 Deployment completed successfully!");
  
  if (network.chainId === 31337) {
    console.log("\n📝 Next steps for LOCAL DEVELOPMENT:");
    console.log("1. 🧪 Run tests: npm test");
    console.log("2. 🎲 Auto-fulfill VRF: npm run vrf-fulfiller");
    console.log("3. 🎰 Test spins with mock VRF coordinator");
  } else {
    console.log("\n📝 Next steps for MAINNET/TESTNET:");
    console.log("1. Update Chainlink VRF subscription to add CasinoSlot as consumer");
    console.log("2. Verify contracts on block explorer");
    console.log("3. Test the deployment with small transactions");
  }
  
  // Step 7: Save deployment data to file
  console.log("\n💾 Saving deployment data...");
  const deploymentData = {
    network: {
      name: hre.network.name,
      chainId: network.chainId,
      timestamp: new Date().toISOString()
    },
    contracts: {
      CasinoSlot: {
        address: casinoSlot.address,
        constructor: {
          vrfCoordinator: CHAINLINK_VRF_COORDINATOR,
          keyHash: CHAINLINK_KEY_HASH,
          subscriptionId: CHAINLINK_SUBSCRIPTION_ID,
          ethUsdPriceFeed: ETH_USD_PRICE_FEED,
          linkUsdPriceFeed: LINK_USD_PRICE_FEED,
          linkToken: LINK_TOKEN,
          uniswapRouter: UNISWAP_V3_ROUTER,
          wethToken: WETH_TOKEN
        }
      },
      PayoutTables: {
        address: payoutTables.address
      }
    },
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    initialFunding: network.chainId === 31337 ? "10.0" : 
                   (process.env.FUND_INITIAL_LIQUIDITY === "true" ? "10.0" : "0.0"),
    developmentMode: network.chainId === 31337,
    poolBalance: ethers.utils.formatEther(await ethers.provider.getBalance(casinoSlot.address)),
    testAddressFunding: network.chainId === 31337 ? {
      address: "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86",
      amount: "5.0",
      balance: ethers.utils.formatEther(await ethers.provider.getBalance("0x92145c8e548A87DFd716b1FD037a5e476a1f2a86"))
    } : null
  };

  // Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment data
  const deploymentFile = path.join(deploymentsDir, `deployment-${network.chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log(`✅ Deployment data saved to: ${deploymentFile}`);

  // Step 8: Auto-extract addresses to frontend
  console.log("\n🔄 Auto-extracting addresses to frontend...");
  try {
    const extractAddresses = require('./extract-addresses.js');
    await extractAddresses();
    console.log("✅ Frontend configuration updated automatically");
  } catch (error) {
    console.warn("⚠️  Auto-extraction failed:", error.message);
    console.warn("Please run manually: npm run extract-addresses");
  }
  
  return {
    payoutTables: payoutTables.address,
    payoutTables7Router: payoutTables7.address,
    payoutTables7Chunks: payoutTables7Chunks,
    casinoSlot: casinoSlot.address
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
    console.log("CasinoSlot:", addresses.casinoSlot);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = main;