// Script to fund the UpgradableSpinTester contract with ETH and LINK
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n💰 Funding UpgradableSpinTester Contract");
  console.log("===============================");
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployments', `upgradable-spin-tester-${network.name}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment file not found: ${deploymentPath}`);
    console.error("Please run the deployment script first");
    process.exit(1);
  }
  
  const deployment = require(deploymentPath);
  const CONTRACT_ADDRESS = deployment.spinTester.proxy;
  const LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Sepolia LINK
  
  console.log(`📝 Contract address: ${CONTRACT_ADDRESS}`);
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`\n🔑 Signer: ${signer.address}`);
  console.log(`💰 ETH Balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH`);
  console.log(`📝 LINK Token address: ${LINK_TOKEN}`);
  
  // Get LINK balance
  const linkToken = await ethers.getContractAt("IERC20", LINK_TOKEN);
  const linkBalance = await linkToken.balanceOf(signer.address);
  console.log(`💰 LINK Balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
  
  // Send ETH
  console.log("\n💸 Sending 0.1 ETH to contract...");
  const ethTx = await signer.sendTransaction({
    to: CONTRACT_ADDRESS,
    value: ethers.utils.parseEther("0.1")
  });
  console.log(`📝 ETH Transaction hash: ${ethTx.hash}`);
  await ethTx.wait();
  console.log("✅ ETH transfer complete");
  
  // Send LINK
  console.log("\n💸 Sending 3.0 LINK to contract...");
  const linkTx = await linkToken.transfer(
    CONTRACT_ADDRESS,
    ethers.utils.parseEther("3.0")
  );
  console.log(`📝 LINK Transaction hash: ${linkTx.hash}`);
  await linkTx.wait();
  console.log("✅ LINK transfer complete");
  
  // Check final balances
  const contractEthBalance = await ethers.provider.getBalance(CONTRACT_ADDRESS);
  const contractLinkBalance = await linkToken.balanceOf(CONTRACT_ADDRESS);
  
  console.log("\n📊 Final Contract Balances:");
  console.log(`ETH: ${ethers.utils.formatEther(contractEthBalance)} ETH`);
  console.log(`LINK: ${ethers.utils.formatEther(contractLinkBalance)} LINK`);
  
  console.log("\n✅ Funding complete!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 