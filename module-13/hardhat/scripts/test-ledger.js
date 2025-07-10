const { ethers } = require("hardhat");

async function testLedger() {
  console.log("Testing Ledger connection on Sepolia...");
  try {
    const signers = await ethers.getSigners();
    console.log("Found signers:", signers.length);
    
    if (signers.length > 0) {
      const address = await signers[0].getAddress();
      console.log("Ledger address:", address);
      
      const balance = await signers[0].getBalance();
      console.log("Balance:", ethers.utils.formatEther(balance), "ETH");
    }
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Full error:", error);
  }
}

testLedger()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });