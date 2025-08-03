import { ethers, run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🏛️ Deploying Governance System...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy Token
  console.log("📋 Deploying GovernanceToken...");
  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(deployer.address); // Pass admin address
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ GovernanceToken deployed to:", tokenAddress);

  // Mint initial supply
  console.log("\n🪙 Minting initial supply...");
  const initialSupply = ethers.parseEther("10000000"); // 10M tokens
  await token.mint(deployer.address, initialSupply);
  console.log("✅ Minted", ethers.formatEther(initialSupply), "tokens to", deployer.address);

  // Deploy Timelock
  console.log("\n📋 Deploying Timelock...");
  const Timelock = await ethers.getContractFactory("Timelock");
  const minDelay = 2 * 24 * 60 * 60; // 2 days
  const timelock = await Timelock.deploy(
    minDelay,
    [], // proposers (will be governor)
    [ethers.ZeroAddress], // executors (anyone can execute)
    deployer.address // admin (will renounce after setup)
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("✅ Timelock deployed to:", timelockAddress);
  console.log("   Min Delay:", minDelay / 3600, "hours");

  // Deploy Governor
  console.log("\n📋 Deploying DAOGovernor...");
  const Governor = await ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(
    tokenAddress,
    timelockAddress,
    1, // 1 block voting delay
    50400, // ~1 week voting period (assuming 12s blocks)
    ethers.parseEther("100000") // 1% proposal threshold
  );
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("✅ DAOGovernor deployed to:", governorAddress);
  console.log("   Voting Delay:", 1, "blocks");
  console.log("   Voting Period:", 50400, "blocks (~1 week)");
  console.log("   Proposal Threshold:", "100,000 tokens (1%)");

  // Setup roles
  console.log("\n🔧 Setting up roles...");
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();

  // Grant proposer role to governor
  await timelock.grantRole(proposerRole, governorAddress);
  console.log("✅ Granted PROPOSER_ROLE to governor");

  // Grant executor role to governor
  await timelock.grantRole(executorRole, governorAddress);
  console.log("✅ Granted EXECUTOR_ROLE to governor");

  // Grant canceller role to governor
  await timelock.grantRole(cancellerRole, governorAddress);
  console.log("✅ Granted CANCELLER_ROLE to governor");

  // Delegate voting power to self (for testing)
  console.log("\n🗳️ Delegating voting power...");
  await token.delegate(deployer.address);
  console.log("✅ Delegated voting power to deployer");

  // Save deployment addresses
  const addresses = {
    network: network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      GovernanceToken: tokenAddress,
      Timelock: timelockAddress,
      DAOGovernor: governorAddress
    },
    configuration: {
      tokenSupply: ethers.formatEther(initialSupply),
      timelockDelay: `${minDelay} seconds (${minDelay / 3600} hours)`,
      votingDelay: "1 blocks",
      votingPeriod: "50400 blocks (~1 week)",
      proposalThreshold: "100000 tokens (1%)",
      quorum: "4%"
    }
  };

  // Create addresses directory if it doesn't exist
  const addressesDir = path.join(__dirname, "../addresses");
  if (!fs.existsSync(addressesDir)) {
    fs.mkdirSync(addressesDir);
  }

  // Save addresses to file
  const addressesPath = path.join(addressesDir, `${network.name}.json`);
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log(`\n💾 Addresses saved to ${addressesPath}`);

  console.log("\n✅ Deployment Complete!");
  console.log("📄 Contract Addresses:");
  console.log(`   GovernanceToken: ${tokenAddress}`);
  console.log(`   Timelock: ${timelockAddress}`);
  console.log(`   DAOGovernor: ${governorAddress}`);

  // Verify contracts if not on localhost
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    // Wait a bit for Etherscan to index the contracts
    console.log("Waiting for Etherscan to index contracts...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

    try {
      // Verify GovernanceToken
      console.log("Verifying GovernanceToken...");
      await run("verify:verify", {
        address: tokenAddress,
        constructorArguments: [deployer.address],
      });

      // Verify Timelock
      console.log("Verifying Timelock...");
      await run("verify:verify", {
        address: timelockAddress,
        constructorArguments: [
          minDelay,
          [],
          [ethers.ZeroAddress],
          deployer.address
        ],
      });

      // Verify DAOGovernor
      console.log("Verifying DAOGovernor...");
      await run("verify:verify", {
        address: governorAddress,
        constructorArguments: [
          tokenAddress,
          timelockAddress,
          1,
          50400,
          ethers.parseEther("100000")
        ],
      });

      console.log("✅ All contracts verified!");
    } catch (error) {
      console.log("❌ Verification failed:", error);
    }
  }

  console.log("\n📋 Next Steps:");
  console.log("1. Transfer token minting rights to a multisig or renounce if fixed supply");
  console.log("2. Renounce timelock admin role to make it fully decentralized");
  console.log("3. Create your first proposal using: npx hardhat gov:propose");
  console.log("4. Check governance state using: npx hardhat gov:state");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });