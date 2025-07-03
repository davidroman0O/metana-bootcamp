const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🧪 Deploying Upgradable SpinTester Contract");
  console.log("===============================");

  // Get deployment parameters from existing deployment or use defaults
  let ethUsdFeed, linkUsdFeed, linkToken, vrfWrapper, uniswapRouter;

  try {
    const deploymentPath = path.join(__dirname, "../deployments/deployment-11155111.json");
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      
      console.log("📝 Using parameters from existing deployment:");
      
      // Access the constructor parameters from the correct location in the JSON
      const constructor = deploymentData.contracts.CasinoSlot.constructor;
      
      ethUsdFeed = constructor.ethUsdPriceFeed;
      linkUsdFeed = constructor.linkUsdPriceFeed;
      linkToken = constructor.linkToken;
      vrfWrapper = constructor.vrfWrapper;
      uniswapRouter = constructor.uniswapRouter;
      
      console.log(`VRF Wrapper: ${vrfWrapper}`);
      console.log(`ETH/USD Feed: ${ethUsdFeed}`);
      console.log(`LINK/USD Feed: ${linkUsdFeed}`);
      console.log(`LINK Token: ${linkToken}`);
      console.log(`Uniswap Router: ${uniswapRouter}`);
    } else {
      throw new Error("Deployment file not found");
    }
  } catch (error) {
    console.error("❌ Error loading deployment data:", error.message);
    return;
  }

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`\n🔑 Deployer: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);

  // Deploy implementation and proxy
  console.log("\n📦 Deploying UpgradableSpinTester contract...");
  const UpgradableSpinTester = await ethers.getContractFactory("UpgradableSpinTester");
  
  const upgradableSpinTester = await upgrades.deployProxy(
    UpgradableSpinTester,
    [ethUsdFeed, linkUsdFeed, linkToken, vrfWrapper, uniswapRouter],
    { 
      initializer: "initialize",
      kind: "uups"
    }
  );

  // Wait for deployment to complete (older ethers.js version)
  await upgradableSpinTester.deployed();
  const proxyAddress = upgradableSpinTester.address;
  console.log(`✅ UpgradableSpinTester deployed to: ${proxyAddress}`);

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`📄 Implementation address: ${implementationAddress}`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    proxy: proxyAddress,
    implementation: implementationAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    constructorArgs: [
      ethUsdFeed,
      linkUsdFeed,
      linkToken,
      vrfWrapper,
      uniswapRouter
    ]
  };

  const deploymentFilePath = path.join(__dirname, "../deployments/upgradable-spin-tester-sepolia.json");
  fs.writeFileSync(
    deploymentFilePath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n📄 Deployment info saved to: ../deployments/upgradable-spin-tester-sepolia.json`);

  console.log(`\n🧪 Next Steps:`);
  console.log(`1. Send ETH to the tester contract: ${proxyAddress}`);
  console.log(`2. Send LINK to the tester contract`);
  console.log(`3. Run individual test functions`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 