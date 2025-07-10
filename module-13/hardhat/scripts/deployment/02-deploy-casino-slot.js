const { ethers, upgrades, network, run } = require("hardhat");
const { getAddresses, saveAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Helper to get network-specific addresses using saved data
function getNetworkConfig(chainId) {
  const isLocal = chainId === 31337;
  
  return {
    vrfWrapper: isLocal ? null : "0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1", // Sepolia VRF v2.5 WRAPPER for DIRECT FUNDING
    // Sepolia testnet addresses
    ethUsdPriceFeed: isLocal ? "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" : "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Sepolia ETH/USD
    isLocal,
  };
}

// Function to save deployment information
function saveDeploymentInfo(chainId, contractData, config) {
  const deploymentPath = path.join(__dirname, '../../deployments', `deployment-${chainId}.json`);
  
  try {
    // Ensure deployments directory exists
    const deploymentsDir = path.dirname(deploymentPath);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Read existing deployment data or create new
    let deploymentData = {};
    if (fs.existsSync(deploymentPath)) {
      deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    // Update deployment data
    deploymentData = {
      ...deploymentData,
      network: {
        name: network.name,
        chainId: chainId,
        timestamp: new Date().toISOString()
      },
      contracts: {
        ...deploymentData.contracts,
        CasinoSlot: {
          address: contractData.proxy,
          implementation: contractData.implementation,
          admin: contractData.admin,
          constructor: {
            vrfWrapper: config.vrfWrapper,
            ethUsdPriceFeed: config.ethUsdPriceFeed,
            payoutTablesAddress: contractData.payoutTablesAddress,
          }
        }
      },
      deployer: contractData.admin,
      vrfVersion: "v2.5-DirectFunding-NativeETH",
      productionMode: !config.isLocal,
      lastUpdated: new Date().toISOString()
    };

    // Write deployment data
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log(`✅ Deployment info saved to: ${path.basename(deploymentPath)}`);
    
  } catch (error) {
    console.error('❌ Error saving deployment info:', error.message);
  }
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
  console.log(`  > VRF Wrapper: ${config.vrfWrapper || 'Mock (local)'}`);
  console.log(`  > ETH/USD Price Feed: ${config.ethUsdPriceFeed}`);

  // Get PayoutTables address
  const payoutAddresses = getAddresses(network.name, "payouts");
  if (!payoutAddresses || !payoutAddresses.payoutTablesAPI) {
    throw new Error("PayoutTables API address not found. Please run 01-deploy-payout-tables.js first.");
  }
  console.log("\n  > Using PayoutTables API from:", payoutAddresses.payoutTablesAPI);

  let wrapperAddress = config.vrfWrapper;
  if (config.isLocal) {
    console.log("\n  > Local network detected. Using mock wrapper...");
    wrapperAddress = "0x0000000000000000000000000000000000000001"; // Mock for local
    console.log("     ✅ Mock wrapper address:", wrapperAddress);
  }

  console.log("\n  > Deploying CasinoSlot (UUPS Proxy)...");
  const CasinoSlot = await ethers.getContractFactory("CasinoSlot");
  const casinoSlot = await withRetry(async () => 
    upgrades.deployProxy(
      CasinoSlot,
      [
        config.ethUsdPriceFeed,
        payoutAddresses.payoutTablesAPI,
        wrapperAddress,
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

  // Save deployment information
  saveDeploymentInfo(chainId, {
    proxy: proxyAddress,
    implementation: implementationAddress,
    admin: deployer.address,
    payoutTablesAddress: payoutAddresses.payoutTablesAPI
  }, config);

  console.log("\n✅ CasinoSlot contract deployed successfully!");
  console.log(`\nNext steps:`);
  console.log(`1. Verify contracts: npx hardhat run scripts/deployment/03-verify-contracts.js --network ${network.name}`);
  console.log("------------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 