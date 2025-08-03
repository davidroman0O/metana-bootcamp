const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("===========================================");
  console.log("Deploying Governance Contracts to Sepolia");
  console.log("Using Ledger Hardware Wallet");
  console.log("===========================================\n");
  
  // Get Ledger signer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with Ledger account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.05")) {
    console.error("⚠️  Warning: Low balance. Recommended at least 0.05 ETH for deployment");
    console.log("\nGet Sepolia ETH from:");
    console.log("- https://sepoliafaucet.com/");
    console.log("- https://www.infura.io/faucet/sepolia");
    return;
  }
  
  // Deploy GovernanceToken
  console.log("\n📜 Deploying GovernanceToken...");
  console.log("Please review and approve on your Ledger device");
  
  const Token = await hre.ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  
  console.log("✅ GovernanceToken deployed to:", await token.getAddress());
  console.log("Waiting for confirmations...");
  await token.deploymentTransaction().wait(5);
  
  // Deploy Timelock
  console.log("\n⏰ Deploying Timelock...");
  console.log("Please review and approve on your Ledger device");
  
  const minDelay = 3600; // 1 hour
  const proposers = [deployer.address]; // Initial proposer
  const executors = [hre.ethers.ZeroAddress]; // Anyone can execute
  
  const Timelock = await hre.ethers.getContractFactory("Timelock");
  const timelock = await Timelock.deploy(minDelay, proposers, executors, deployer.address);
  await timelock.waitForDeployment();
  
  console.log("✅ Timelock deployed to:", await timelock.getAddress());
  console.log("Waiting for confirmations...");
  await timelock.deploymentTransaction().wait(5);
  
  // Deploy Governor
  console.log("\n🏛️  Deploying DAOGovernor...");
  console.log("Please review and approve on your Ledger device");
  
  const Governor = await hre.ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(
    await token.getAddress(),
    await timelock.getAddress(),
    6545,   // 1 day voting delay (in blocks)
    45818,  // 1 week voting period (in blocks)
    hre.ethers.parseEther("1") // 1 token proposal threshold
  );
  await governor.waitForDeployment();
  
  console.log("✅ DAOGovernor deployed to:", await governor.getAddress());
  console.log("Waiting for confirmations...");
  await governor.deploymentTransaction().wait(5);
  
  // Setup roles
  console.log("\n🔐 Setting up roles...");
  
  // Grant proposer role to governor
  const proposerRole = await timelock.PROPOSER_ROLE();
  const proposerTx = await timelock.grantRole(proposerRole, await governor.getAddress());
  console.log("Please approve: Grant PROPOSER_ROLE to Governor");
  await proposerTx.wait();
  
  // Grant executor role to governor
  const executorRole = await timelock.EXECUTOR_ROLE();
  const executorTx = await timelock.grantRole(executorRole, await governor.getAddress());
  console.log("Please approve: Grant EXECUTOR_ROLE to Governor");
  await executorTx.wait();
  
  // Revoke admin role from deployer (make it fully decentralized)
  // Uncomment when ready to fully decentralize
  // const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();
  // const revokeTx = await timelock.revokeRole(adminRole, deployer.address);
  // console.log("Please approve: Revoke ADMIN_ROLE from deployer");
  // await revokeTx.wait();
  
  console.log("✅ Roles configured successfully");
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    deploymentDate: new Date().toISOString(),
    contracts: {
      GovernanceToken: {
        address: await token.getAddress(),
        transactionHash: (await token.deploymentTransaction()).hash,
      },
      Timelock: {
        address: await timelock.getAddress(),
        transactionHash: (await timelock.deploymentTransaction()).hash,
        minDelay: minDelay,
      },
      DAOGovernor: {
        address: await governor.getAddress(),
        transactionHash: (await governor.deploymentTransaction()).hash,
        votingDelay: "6545 blocks (~1 day)",
        votingPeriod: "45818 blocks (~1 week)",
        proposalThreshold: "1 token",
      }
    },
    configuration: {
      tokenSupply: "1000000 tokens",
      timelockDelay: "1 hour",
      quorum: "4%",
    }
  };
  
  // Save to file
  fs.writeFileSync(
    "deployment-sepolia.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n===========================================");
  console.log("🎉 Deployment Complete!");
  console.log("===========================================");
  console.log("\n📄 Deployment saved to: deployment-sepolia.json");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${await token.getAddress()} "${deployer.address}"`);
  console.log(`   npx hardhat verify --network sepolia ${await timelock.getAddress()} ${minDelay} ["${deployer.address}"] ["${hre.ethers.ZeroAddress}"] "${deployer.address}"`);
  console.log(`   npx hardhat verify --network sepolia ${await governor.getAddress()} "${await token.getAddress()}" "${await timelock.getAddress()}" 6545 45818 "${hre.ethers.parseEther("1")}"`);
  console.log("\n2. Create Snapshot space with token address:", await token.getAddress());
  console.log("\n3. Test governance flow with test proposals");
  
  // Display gas usage summary
  const tokenTx = await token.deploymentTransaction();
  const timelockTx = await timelock.deploymentTransaction();
  const governorTx = await governor.deploymentTransaction();
  
  const tokenGas = tokenTx.gasLimit * (tokenTx.gasPrice || 0n);
  const timelockGas = timelockTx.gasLimit * (timelockTx.gasPrice || 0n);
  const governorGas = governorTx.gasLimit * (governorTx.gasPrice || 0n);
  const totalGas = tokenGas + timelockGas + governorGas;
  
  console.log("\n⛽ Gas Usage Summary:");
  console.log("Token deployment:", hre.ethers.formatEther(tokenGas), "ETH");
  console.log("Timelock deployment:", hre.ethers.formatEther(timelockGas), "ETH");
  console.log("Governor deployment:", hre.ethers.formatEther(governorGas), "ETH");
  console.log("Total gas used:", hre.ethers.formatEther(totalGas), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  });