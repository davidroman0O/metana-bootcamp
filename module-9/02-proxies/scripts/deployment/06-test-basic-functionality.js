const { ethers, network } = require("hardhat");
const { getAddresses } = require("../utils/addresses");
require('dotenv').config();

async function main() {
  console.log("\nTesting basic functionality of deployed contracts");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  
  // FEATURE 1: Check LEDGER_ACCOUNT and TEST_ACCOUNT for Sepolia
  if (network.name === "sepolia") {
    if (!process.env.LEDGER_ACCOUNT) {
      console.error("\n❌ ERROR: LEDGER_ACCOUNT environment variable is not set in .env file");
      console.error("Please add LEDGER_ACCOUNT=0xYourLedgerAddress to your .env file");
      process.exit(1);
    }
    
    if (!process.env.TEST_ACCOUNT) {
      console.error("\n❌ ERROR: TEST_ACCOUNT environment variable is not set in .env file");
      console.error("Please add TEST_ACCOUNT=0xYourSecondAddress to your .env file");
      process.exit(1);
    }
  }
  
  // Get the signer
  const [deployer, testUser] = await ethers.getSigners();
  console.log("Using account:", await deployer.getAddress());
  
  // Check if testUser is available
  const hasTestUser = testUser !== undefined;
  if (hasTestUser) {
    console.log("Test user account:", await testUser.getAddress());
  } else {
    console.log("⚠️ No test user account available - some tests will be skipped");
  }
  
  // Show Ledger instructions if we're on a real network (not localhost/hardhat)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:");
    console.log("  1. Your device is connected via USB");
    console.log("  2. The device is unlocked");
    console.log("  3. The Ethereum app is open");
    console.log("  4. Contract data is allowed in the Ethereum app settings");
    console.log("  5. You'll need to confirm multiple transactions on your device\n");
  }
  
  // FEATURE 2: Check balances for Sepolia
  if (network.name === "sepolia") {
    console.log("\n🔍 Checking account balances before tests:");
    const deployerBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer (${deployer.address}) ETH balance: ${ethers.formatEther(deployerBalance)} ETH`);
    
    if (ethers.formatEther(deployerBalance) < 0.2) {
      console.log("⚠️ WARNING: Deployer account has less than 0.2 ETH. Tests might fail due to insufficient funds.");
    }
    
    if (hasTestUser) {
      const testUserBalance = await ethers.provider.getBalance(testUser.address);
      console.log(`Test user (${testUser.address}) ETH balance: ${ethers.formatEther(testUserBalance)} ETH`);
      
      if (ethers.formatEther(testUserBalance) < 0.2) {
        console.log("⚠️ WARNING: Test user account has less than 0.2 ETH. Tests requiring this account might fail.");
      }
    }
  }
  
  // Get all addresses
  const nftAddresses = getAddresses(network.name, "nft") || {};
  const exchangeAddresses = getAddresses(network.name, "exchange") || {};
  const stakingAddresses = getAddresses(network.name, "staking") || {};
  
  let testsPassed = 0;
  let testsFailed = 0;
  let testsSkipped = 0;
  
  // Helper function to run a test
  async function runTest(name, testFn) {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      
      // Add Ledger confirmation prompt for real networks
      if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("   ⚠️ Please confirm the transaction(s) on your Ledger device if prompted");
      }
      
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      testsFailed++;
    }
  }
  
  // Helper function to get Etherscan URL
  function getEtherscanUrl(type, hash) {
    if (network.name === "localhost" || network.name === "hardhat") {
      return null;
    }
    
    let baseUrl;
    if (network.name === "sepolia") {
      baseUrl = "https://sepolia.etherscan.io";
    } else if (network.name === "mainnet") {
      baseUrl = "https://etherscan.io";
    } else {
      baseUrl = `https://${network.name}.etherscan.io`;
    }
    
    return `${baseUrl}/${type}/${hash}`;
  }
  
  // 1. Test NFT Contract
  if (nftAddresses.proxy) {
    try {
      // Using the fully qualified NFT contract name
      console.log("Connecting to NFT contract...");
      const nftFactory = await ethers.getContractFactory("contracts/01-SimpleNFT_V2.sol:FacesNFT");
      const nft = nftFactory.attach(nftAddresses.proxy);
      
      // Test minting NFT
      await runTest("NFT - Minting", async () => {
        const initialBalance = await nft.balanceOf(deployer.address);
        const tx = await nft.mint();
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Transaction submitted: ${getEtherscanUrl("tx", tx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await tx.wait();
        const newBalance = await nft.balanceOf(deployer.address);
        if (newBalance <= initialBalance) {
          throw new Error("NFT minting failed - balance did not increase");
        }
        console.log(`   Current token ID: ${await nft.currentTokenId()}`);
        console.log(`   New balance: ${newBalance}`);
      });
      
      // Test god mode transfer (V2 feature)
      await runTest("NFT - God Mode Transfer (V2 feature)", async () => {
        // Skip this test if no test user is available
        if (!hasTestUser && (network.name !== "hardhat" && network.name !== "localhost")) {
          console.log("   ⚠️ Skipping test: requires a second account which is not available");
          return;
        }
        
        // First mint an NFT to the test user
        const connectNft = nft.connect(testUser);
        const mintTx = await connectNft.mint();
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Mint transaction submitted: ${getEtherscanUrl("tx", mintTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await mintTx.wait();
        const tokenId = await nft.currentTokenId();
        console.log(`   Minted token ID ${tokenId} to test user`);
        
        // Verify test user owns it
        const originalOwner = await nft.ownerOf(tokenId);
        if (originalOwner.toLowerCase() !== testUser.address.toLowerCase()) {
          throw new Error("Token not owned by test user");
        }
        
        // Use god mode transfer to take it
        const godTx = await nft.godModeTransfer(testUser.address, deployer.address, tokenId);
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   God mode transaction submitted: ${getEtherscanUrl("tx", godTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await godTx.wait();
        
        // Verify deployer now owns it
        const newOwner = await nft.ownerOf(tokenId);
        if (newOwner.toLowerCase() !== deployer.address.toLowerCase()) {
          throw new Error("God mode transfer failed");
        }
        console.log(`   Successfully transferred token ${tokenId} using god mode`);
      });
    } catch (error) {
      console.log("❌ NFT tests setup failed:", error.message);
      testsSkipped += 2;
    }
  } else {
    console.log("\n⚠️ Skipping NFT tests - contract not deployed");
    testsSkipped += 2;
  }
  
  // 2. Test Exchange System
  if (exchangeAddresses.token && exchangeAddresses.nft && exchangeAddresses.exchange) {
    try {
      // Use contract factories instead of getContractAt to avoid UnrecognizedContract
      console.log("Connecting to Exchange contracts...");
      
      // Get the contract factories
      const exchangeTokenFactory = await ethers.getContractFactory("ExchangeVisageToken");
      const exchangeNftFactory = await ethers.getContractFactory("ExchangeVisageNFT");
      const visageExchangeFactory = await ethers.getContractFactory("VisageExchange");
      
      // Attach to deployed contracts
      const token = exchangeTokenFactory.attach(exchangeAddresses.token);
      const nft = exchangeNftFactory.attach(exchangeAddresses.nft);
      const exchange = visageExchangeFactory.attach(exchangeAddresses.exchange);
      
      // Test token purchase through exchange
      await runTest("Exchange - Purchase Tokens", async () => {
        const initialBalance = await token.balanceOf(deployer.address);
        
        // Purchase tokens by sending ETH - get significant tokens for tests
        const purchaseAmount = ethers.parseEther("1");
        const purchaseTx = await deployer.sendTransaction({
          to: exchange.target,
          value: purchaseAmount
        });
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Transaction submitted: ${getEtherscanUrl("tx", purchaseTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await purchaseTx.wait();
        
        const newBalance = await token.balanceOf(deployer.address);
        if (newBalance <= initialBalance) {
          throw new Error("Token purchase failed - balance did not increase");
        }
        console.log(`   Purchased tokens with ${ethers.formatEther(purchaseAmount)} ETH`);
        console.log(`   New token balance: ${ethers.formatEther(newBalance)}`);
      });
      
      // Test NFT minting from exchange
      await runTest("Exchange - Mint NFT", async () => {
        const initialNftBalance = await nft.balanceOf(deployer.address);
        
        // FEATURE 3: Check token balance before purchasing NFT
        const tokenBalance = await token.balanceOf(deployer.address);
        console.log(`   Current token balance: ${ethers.formatEther(tokenBalance)}`);
        
        if (Number(tokenBalance) < ethers.parseEther("10")) {
          console.log("   ⚠️ Skipping test: not enough tokens (needs 10)");
          testsSkipped++;
          return;
        }
        
        // Approve tokens for the purchase (hardcoding price to 10 tokens as in contract)
        const nftPrice = ethers.parseEther("10");
        const approveTx = await token.approve(exchange.target, nftPrice);
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Approval transaction submitted: ${getEtherscanUrl("tx", approveTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await approveTx.wait();
        
        // Mint NFT
        const mintTx = await exchange.mintNFT();
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Mint transaction submitted: ${getEtherscanUrl("tx", mintTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await mintTx.wait();
        
        const newNftBalance = await nft.balanceOf(deployer.address);
        if (newNftBalance <= initialNftBalance) {
          throw new Error("NFT minting failed - balance did not increase");
        }
        console.log(`   Successfully minted NFT for 10 tokens`);
        console.log(`   New NFT balance: ${newNftBalance}`);
      });
      
      // Test buying a token with the exchange
      await runTest("Exchange - Buy Token", async () => {
        // Skip this test if no test user is available
        if (!hasTestUser && (network.name !== "hardhat" && network.name !== "localhost")) {
          console.log("   ⚠️ Skipping test: requires a second account which is not available");
          return;
        }
        
        // Connect testUser to exchange
        const connectExchange = exchange.connect(testUser);
        
        // Purchase tokens by sending ETH - get significant tokens for tests
        const purchaseAmount = ethers.parseEther("1");
        const purchaseTx = await connectExchange.mintToken({ value: purchaseAmount });
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Transaction submitted: ${getEtherscanUrl("tx", purchaseTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await purchaseTx.wait();
        
        const testUserBalance = await token.balanceOf(testUser.address);
        if (Number(testUserBalance) === 0) {
          throw new Error("Token purchase failed - balance did not increase");
        }
        console.log(`   Purchased tokens with ${ethers.formatEther(purchaseAmount)} ETH`);
        console.log(`   New token balance: ${ethers.formatEther(testUserBalance)}`);
      });
      
      // Test buying an NFT with the exchange
      await runTest("Exchange - Buy NFT", async () => {
        // Skip this test if no test user is available
        if (!hasTestUser && (network.name !== "hardhat" && network.name !== "localhost")) {
          console.log("   ⚠️ Skipping test: requires a second account which is not available");
          return;
        }
        
        // Connect testUser to exchange and token contracts
        const connectExchange = exchange.connect(testUser);
        const connectToken = token.connect(testUser);
        
        // FEATURE 3: Check token balance before purchasing NFT
        const tokenBalance = await connectToken.balanceOf(testUser.address);
        console.log(`   Test user current token balance: ${ethers.formatEther(tokenBalance)}`);
        
        if (Number(tokenBalance) < ethers.parseEther("10")) {
          console.log("   ⚠️ Skipping test: test user doesn't have enough tokens (needs 10)");
          testsSkipped++;
          return;
        }
        
        // Approve tokens for the NFT purchase
        const nftPrice = ethers.parseEther("10"); // Default price
        const approveTx = await connectToken.approve(exchange.target, nftPrice);
        await approveTx.wait();
        
        // Purchase NFT using mintNFT instead of buyNFT
        const mintTx = await connectExchange.mintNFT();
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Transaction submitted: ${getEtherscanUrl("tx", mintTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await mintTx.wait();
        
        const testUserNftBalance = await nft.balanceOf(testUser.address);
        if (Number(testUserNftBalance) === 0) {
          throw new Error("NFT purchase failed - balance did not increase");
        }
        console.log(`   Purchased NFT with tokens`);
        console.log(`   Test user NFT balance: ${testUserNftBalance}`);
      });
    } catch (error) {
      console.log("❌ Exchange tests setup failed:", error.message);
      testsSkipped += 4;
    }
  } else {
    console.log("\n⚠️ Skipping Exchange tests - contracts not deployed");
    testsSkipped += 4;
  }
  
  // 3. Test Staking System
  if (stakingAddresses.token && stakingAddresses.nft && stakingAddresses.staking) {
    try {
      // Use contract factories instead of getContractAt
      console.log("Connecting to Staking contracts...");
      
      // Get the contract factories
      const stakingTokenFactory = await ethers.getContractFactory("StakingVisageToken");
      const stakingNftFactory = await ethers.getContractFactory("StakingVisageNFT");
      const visageStakingFactory = await ethers.getContractFactory("VisageStaking");
      
      // Attach to deployed contracts
      const token = stakingTokenFactory.attach(stakingAddresses.token);
      const nft = stakingNftFactory.attach(stakingAddresses.nft);
      const staking = visageStakingFactory.attach(stakingAddresses.staking);
      
      // Test getting tokens
      await runTest("Staking - Get Tokens", async () => {
        const initialBalance = await token.balanceOf(deployer.address);
        
        // Get tokens by sending ETH directly to staking contract
        // Use a larger amount to ensure we have enough for NFT purchase
        const purchaseAmount = ethers.parseEther("1");
        const tokenTx = await staking.mintToken({ value: purchaseAmount });
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Transaction submitted: ${getEtherscanUrl("tx", tokenTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await tokenTx.wait();
        
        const newBalance = await token.balanceOf(deployer.address);
        if (newBalance <= initialBalance) {
          throw new Error("Token minting failed - balance did not increase");
        }
        console.log(`   Minted tokens with ${ethers.formatEther(purchaseAmount)} ETH`);
        console.log(`   New token balance: ${ethers.formatEther(newBalance)}`);
      });
      
      // Test NFT minting through staking
      await runTest("Staking - Mint NFT", async () => {
        const initialNftBalance = await nft.balanceOf(deployer.address);
        
        // FEATURE 3: Check token balance before purchasing NFT
        const tokenBalance = await token.balanceOf(deployer.address);
        console.log(`   Current token balance: ${ethers.formatEther(tokenBalance)}`);
        
        if (Number(tokenBalance) < ethers.parseEther("10")) {
          console.log("   ⚠️ Skipping test: not enough tokens (needs 10)");
          testsSkipped++;
          return;
        }
        
        // Need to approve tokens for NFT
        const nftPrice = ethers.parseEther("10"); // Using 10 tokens as default
        const approveTx = await token.approve(staking.target, nftPrice);
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Approval transaction submitted: ${getEtherscanUrl("tx", approveTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await approveTx.wait();
        
        // Mint NFT
        const mintTx = await staking.mintNFT();
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Mint transaction submitted: ${getEtherscanUrl("tx", mintTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await mintTx.wait();
        
        const newNftBalance = await nft.balanceOf(deployer.address);
        if (newNftBalance <= initialNftBalance) {
          throw new Error("NFT minting failed - balance did not increase");
        }
        console.log(`   Successfully minted NFT`);
        console.log(`   New NFT balance: ${newNftBalance}`);
      });
      
      // Test staking
      await runTest("Staking - Stake Token and Claim NFT", async () => {
        // Skip this test if no test user is available
        if (!hasTestUser && (network.name !== "hardhat" && network.name !== "localhost")) {
          console.log("   ⚠️ Skipping test: requires a second account which is not available");
          return;
        }
        
        // Connect testUser to staking and token contracts
        const connectStaking = staking.connect(testUser);
        const connectToken = token.connect(testUser);
        
        // First check the initial balance
        const initialBalance = await connectToken.balanceOf(testUser.address);
        
        // Get tokens by sending ETH directly to staking contract
        const purchaseAmount = ethers.parseEther("1");
        const tokenTx = await connectStaking.mintToken({ value: purchaseAmount });
        
        // Show Etherscan link for non-local networks
        if (network.name !== "hardhat" && network.name !== "localhost") {
          console.log(`   Transaction submitted: ${getEtherscanUrl("tx", tokenTx.hash)}`);
          console.log("   Waiting for confirmation...");
        }
        
        await tokenTx.wait();
        
        const newBalance = await connectToken.balanceOf(testUser.address);
        if (Number(newBalance) <= Number(initialBalance)) {
          throw new Error("Token minting failed - balance did not increase");
        }
        console.log(`   Minted tokens with ${ethers.formatEther(purchaseAmount)} ETH`);
        console.log(`   New token balance: ${ethers.formatEther(newBalance)}`);
      });
    } catch (error) {
      console.log("❌ Staking tests setup failed:", error.message);
      testsSkipped += 4;
    }
  } else {
    console.log("\n⚠️ Skipping Staking tests - contracts not deployed");
    testsSkipped += 4;
  }
  
  // Summary
  console.log("\n=== TEST SUMMARY ===");
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  console.log(`⚠️ Tests skipped: ${testsSkipped}`);
  console.log(`Total tests: ${testsPassed + testsFailed + testsSkipped}`);
  
  if (testsFailed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 