const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔍 Examining Transaction Details");
  console.log("=============================");
  
  // Transaction hash from the failed test
  const txHash = "0x433532bc513cc0fe57675c7e4a337c4c6a8721e8a75421f7036ef417d57d36d1";
  
  console.log(`Examining transaction: ${txHash}`);
  
  try {
    // Get transaction details
    const tx = await ethers.provider.getTransaction(txHash);
    console.log(`\n📝 Transaction details:`);
    console.log(`From: ${tx.from}`);
    console.log(`To: ${tx.to}`);
    console.log(`Value: ${ethers.utils.formatEther(tx.value)} ETH`);
    console.log(`Gas price: ${ethers.utils.formatUnits(tx.gasPrice, "gwei")} gwei`);
    console.log(`Gas limit: ${tx.gasLimit.toString()}`);
    
    // Get transaction receipt
    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    console.log(`\n📝 Transaction receipt:`);
    console.log(`Status: ${receipt.status ? "Success" : "Failed"}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Block number: ${receipt.blockNumber}`);
    
    // Get the trace of the transaction
    console.log(`\n📝 Transaction trace:`);
    console.log(`Let's examine the error more closely...`);
    
    // Get the contract ABI
    const testerABI = require("../artifacts/contracts/UpgradableSpinTester.sol/UpgradableSpinTester.json").abi;
    const tester = new ethers.Contract(tx.to, testerABI, ethers.provider);
    
    // Parse the input data
    const parsedInput = tester.interface.parseTransaction({ data: tx.data });
    console.log(`\n📝 Function called: ${parsedInput.name}`);
    console.log(`Arguments:`, parsedInput.args);
    
    // Get the logs
    console.log(`\n📝 Transaction logs:`);
    for (const log of receipt.logs) {
      try {
        const parsedLog = tester.interface.parseLog(log);
        console.log(`Event: ${parsedLog.name}`);
        console.log(`Arguments:`, parsedLog.args);
      } catch (e) {
        // This log is from another contract or not parseable
        console.log(`Log from address: ${log.address}`);
        console.log(`Data: ${log.data}`);
        console.log(`Topics:`, log.topics);
      }
    }
    
    // Get the error reason if available
    if (!receipt.status) {
      try {
        const tx = await ethers.provider.call(
          {
            from: tx.from,
            to: tx.to,
            data: tx.data,
            value: tx.value,
            gasLimit: tx.gasLimit,
            gasPrice: tx.gasPrice,
          },
          receipt.blockNumber
        );
        console.log(`\n📝 Transaction result:`, tx);
      } catch (error) {
        console.log(`\n❌ Error reason:`, error.reason || error.message);
        
        // Try to decode the error
        if (error.data) {
          try {
            const decodedError = tester.interface.parseError(error.data);
            console.log(`\n📝 Decoded error:`, decodedError);
          } catch (e) {
            console.log(`\n❌ Could not decode error data:`, error.data);
          }
        }
      }
    }
    
    // Check the contract's LINK token balance
    const linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Sepolia LINK token
    const linkABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function allowance(address owner, address spender) view returns (uint256)",
    ];
    const linkToken = new ethers.Contract(linkTokenAddress, linkABI, ethers.provider);
    
    const contractAddress = tx.to;
    const vrfWrapperAddress = "0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1"; // Sepolia VRF Wrapper
    
    const linkBalance = await linkToken.balanceOf(contractAddress);
    console.log(`\n💰 Contract LINK balance: ${ethers.utils.formatEther(linkBalance)} LINK`);
    
    const linkAllowance = await linkToken.allowance(contractAddress, vrfWrapperAddress);
    console.log(`\n🔑 LINK allowance for VRF Wrapper: ${ethers.utils.formatEther(linkAllowance)} LINK`);
    
    // Get the contract's code to check if it's using transferAndCall correctly
    console.log(`\n🔍 Checking contract's _requestRandomWordsWithLINK implementation...`);
    console.log(`This function should be using linkToken.transferAndCall(...) to send LINK to the VRF wrapper.`);
    console.log(`The issue might be that the contract is trying to use transferAndCall but doesn't have enough LINK tokens or hasn't approved the VRF wrapper.`);
    
    // Recommend a solution
    console.log(`\n🔧 Recommended solution:`);
    console.log(`1. The issue is likely in the _requestRandomWordsWithLINK function.`);
    console.log(`2. The contract is trying to use transferAndCall but it's failing with "ERC20: transfer amount exceeds balance".`);
    console.log(`3. This suggests that either:`);
    console.log(`   a. The contract doesn't have enough LINK tokens (but we've verified it has ${ethers.utils.formatEther(linkBalance)} LINK)`);
    console.log(`   b. There's an issue with how transferAndCall is being used in the contract`);
    console.log(`4. Since the native ETH payment method works, we recommend using that instead for now.`);
    console.log(`5. If you need to use LINK payment, you'll need to fix the _requestRandomWordsWithLINK function.`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 