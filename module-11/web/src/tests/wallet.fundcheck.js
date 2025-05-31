// Check for funds on Sepolia testnet
// Run with: node src/tests/wallet.fundcheck.js

const dotenv = require('dotenv');
dotenv.config();

const TEST_ADDRESS = process.env.TEST_ADDRESS || '';
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

if (!TEST_PRIVATE_KEY || !TEST_ADDRESS) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please make sure TEST_PRIVATE_KEY and TEST_ADDRESS are set in your .env file.');
  process.exit(1);
}

async function callJsonRpc(method, params = []) {
  console.log(`Calling ${method} with params:`, params);
  
  try {
    const response = await fetch(SEPOLIA_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 1000000), // Random ID
        method,
        params,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('RPC Error:', data.error);
      throw new Error(`RPC Error: ${data.error.message || 'Unknown error'}`);
    }
    
    console.log(`${method} response:`, data.result);
    return data.result;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Function to check the balance
async function checkBalance(address) {
  console.log(`\nChecking balance for ${address}...`);
  const balanceHex = await callJsonRpc('eth_getBalance', [address, 'latest']);
  const balanceWei = parseInt(balanceHex, 16);
  const balanceEth = balanceWei / 1e18;
  
  console.log(`Balance: ${balanceWei} wei (${balanceEth} ETH)`);
  return balanceWei;
}

// Function to check account transactions
async function checkTransactions(address) {
  try {
    // Using eth_getLogs as a proxy to see if there are any activities for this account
    console.log(`\nChecking for transactions involving ${address}...`);
    
    // Check for transactions where this address is the sender (from)
    const sentTxCountHex = await callJsonRpc('eth_getTransactionCount', [address, 'latest']);
    const sentTxCount = parseInt(sentTxCountHex, 16);
    console.log(`Transaction count (nonce): ${sentTxCount}`);
    
    if (sentTxCount > 0) {
      console.log(`This account has sent ${sentTxCount} transactions.`);
    } else {
      console.log('This account has not sent any transactions.');
    }
    
    // We can't easily check received transactions without an explorer API
    // But we can check the account's code to see if it's a contract
    const code = await callJsonRpc('eth_getCode', [address, 'latest']);
    if (code !== '0x') {
      console.log('This address is a contract.');
    } else {
      console.log('This address is a normal account (not a contract).');
    }
  } catch (error) {
    console.error('Error checking transactions:', error.message);
  }
}

// Main function to run all checks
async function runDiagnostics() {
  console.log('=== SEPOLIA TESTNET ACCOUNT DIAGNOSTICS ===');
  console.log(`Address: ${TEST_ADDRESS}`);
  console.log(`Private Key: ${TEST_PRIVATE_KEY.substring(0, 6)}...${TEST_PRIVATE_KEY.substring(58)}`);
  
  try {
    // Check balance
    const balance = await checkBalance(TEST_ADDRESS);
    
    if (balance === 0) {
      console.log('\n⚠️  This account has ZERO balance!');
      console.log('To use this account, you need to fund it with Sepolia ETH.');
      console.log('You can get Sepolia ETH from faucets like:');
      console.log('- https://sepoliafaucet.com/');
      console.log('- https://sepolia-faucet.pk910.de/');
    } else {
      console.log('\n✅ This account has funds! Balance:', balance, 'wei');
    }
    
    // Check for transactions
    await checkTransactions(TEST_ADDRESS);
    
    console.log('\n=== DIAGNOSTICS COMPLETE ===');
    console.log('You can check this address on Sepolia Etherscan:');
    console.log(`https://sepolia.etherscan.io/address/${TEST_ADDRESS}`);
    
    // Additional information specifically for our transaction error case
    if (balance > 0) {
      console.log('\n🔎 SPECIAL DIAGNOSTIC NOTE:');
      console.log('Even though your account shows a balance, when trying to send transactions');
      console.log('you may get an "insufficient funds" error. This could happen if:');
      console.log('1. The balance is only "reported" but not actually accessible (viewed wallet is different from transaction sender)');
      console.log('2. There is a discrepancy between what eth_getBalance reports and what the transaction processor checks');
      console.log('3. The transaction is using a different account than expected');
    }
  } catch (error) {
    console.error('\nDiagnostics failed:', error.message);
  }
}

runDiagnostics().catch(console.error); 