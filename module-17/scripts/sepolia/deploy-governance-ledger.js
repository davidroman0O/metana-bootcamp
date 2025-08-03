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
  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(hre.ethers.utils.parseEther("0.05"))) {
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
  const token = await Token.deploy();
  await token.deployed();
  
  console.log("✅ GovernanceToken deployed to:", token.address);
  console.log("Waiting for confirmations...");
  await token.deployTransaction.wait(5);
  
  // Deploy Timelock
  console.log("\n⏰ Deploying Timelock...");
  console.log("Please review and approve on your Ledger device");
  
  const minDelay = 3600; // 1 hour
  const proposers = [deployer.address]; // Initial proposer
  const executors = [hre.ethers.constants.AddressZero]; // Anyone can execute
  
  const Timelock = await hre.ethers.getContractFactory("TimeLock");
  const timelock = await Timelock.deploy(minDelay, proposers, executors);
  await timelock.deployed();
  
  console.log("✅ Timelock deployed to:", timelock.address);
  console.log("Waiting for confirmations...");
  await timelock.deployTransaction.wait(5);
  
  // Deploy Governor
  console.log("\n🏛️  Deploying DAOGovernor...");
  console.log("Please review and approve on your Ledger device");
  
  const Governor = await hre.ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(
    token.address,
    timelock.address,
    6545,   // 1 day voting delay (in blocks)
    45818,  // 1 week voting period (in blocks)
    hre.ethers.utils.parseEther("1") // 1 token proposal threshold
  );
  await governor.deployed();
  
  console.log("✅ DAOGovernor deployed to:", governor.address);
  console.log("Waiting for confirmations...");
  await governor.deployTransaction.wait(5);
  
  // Setup roles
  console.log("\n🔐 Setting up roles...");
  
  // Grant proposer role to governor
  const proposerRole = await timelock.PROPOSER_ROLE();
  const proposerTx = await timelock.grantRole(proposerRole, governor.address);
  console.log("Please approve: Grant PROPOSER_ROLE to Governor");
  await proposerTx.wait();
  
  // Grant executor role to governor
  const executorRole = await timelock.EXECUTOR_ROLE();
  const executorTx = await timelock.grantRole(executorRole, governor.address);
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
        address: token.address,
        transactionHash: token.deployTransaction.hash,
      },
      Timelock: {
        address: timelock.address,
        transactionHash: timelock.deployTransaction.hash,
        minDelay: minDelay,
      },
      DAOGovernor: {
        address: governor.address,
        transactionHash: governor.deployTransaction.hash,
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
  console.log(`   npx hardhat verify --network sepolia ${token.address}`);
  console.log(`   npx hardhat verify --network sepolia ${timelock.address} ${minDelay} ["${deployer.address}"] ["${hre.ethers.constants.AddressZero}"]`);
  console.log(`   npx hardhat verify --network sepolia ${governor.address} "${token.address}" "${timelock.address}" 6545 45818 "${hre.ethers.utils.parseEther("1")}"`);
  console.log("\n2. Create Snapshot space with token address:", token.address);
  console.log("\n3. Test governance flow with test proposals");
  
  // Display gas usage summary
  const tokenGas = token.deployTransaction.gasLimit.mul(token.deployTransaction.gasPrice || 0);
  const timelockGas = timelock.deployTransaction.gasLimit.mul(timelock.deployTransaction.gasPrice || 0);
  const governorGas = governor.deployTransaction.gasLimit.mul(governor.deployTransaction.gasPrice || 0);
  const totalGas = tokenGas.add(timelockGas).add(governorGas);
  
  console.log("\n⛽ Gas Usage Summary:");
  console.log("Token deployment:", hre.ethers.utils.formatEther(tokenGas), "ETH");
  console.log("Timelock deployment:", hre.ethers.utils.formatEther(timelockGas), "ETH");
  console.log("Governor deployment:", hre.ethers.utils.formatEther(governorGas), "ETH");
  console.log("Total gas used:", hre.ethers.utils.formatEther(totalGas), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  });