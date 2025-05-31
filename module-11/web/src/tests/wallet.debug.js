// Simple script to debug wallet issues
// Used during development because i had tons of issues creating that wallet
// Run with: node src/tests/wallet.debug.js

const { keccak256 } = require('ethereum-cryptography/keccak');
const { secp256k1 } = require('ethereum-cryptography/secp256k1');
const { hexToBytes, bytesToHex } = require('ethereum-cryptography/utils');

const dotenv = require('dotenv');

dotenv.config();

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const TEST_ADDRESS = process.env.TEST_ADDRESS || '';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const ALTERNATE_RPC_URL = 'https://rpc.sepolia.org'; 
const SEPOLIA_CHAIN_ID = 11155111;

if (!TEST_PRIVATE_KEY || !TEST_ADDRESS) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please make sure TEST_PRIVATE_KEY and TEST_ADDRESS are set in your .env file.');
  process.exit(1);
}

async function fetchJsonRpc(method, params = [], rpcUrl = SEPOLIA_RPC_URL) {
  try {
    console.log(`Making RPC call to ${rpcUrl.substring(0, 30)}...: ${method}`, params);
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();
    console.log(`RPC Response:`, data);

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result;
  } catch (error) {
    console.error(`RPC Fetch Error: ${error.message}`);
    throw error;
  }
}

function getAddressFromPrivateKey(privateKeyHex) {
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const publicKeyBytesUncompressed = secp256k1.getPublicKey(privateKeyBytes);
  const publicKeyBytes = publicKeyBytesUncompressed.slice(1);
  const addressBytes = keccak256(publicKeyBytes).slice(-20);
  return '0x' + bytesToHex(addressBytes);
}

// Check balance on multiple RPC endpoints
async function checkBalancesOnMultipleEndpoints(address) {
  console.log(`\nChecking balance for address across multiple endpoints: ${address}`);
  
  try {
    // Check on Alchemy
    const alchemyBalanceHex = await fetchJsonRpc('eth_getBalance', [address, 'latest'], SEPOLIA_RPC_URL);
    const alchemyBalance = BigInt(alchemyBalanceHex);
    console.log(`Alchemy Balance: ${alchemyBalance} wei (${Number(alchemyBalance) / 1e18} ETH)`);
    
    // Check on Public RPC
    try {
      const publicBalanceHex = await fetchJsonRpc('eth_getBalance', [address, 'latest'], ALTERNATE_RPC_URL);
      const publicBalance = BigInt(publicBalanceHex);
      console.log(`Public RPC Balance: ${publicBalance} wei (${Number(publicBalance) / 1e18} ETH)`);
    } catch (error) {
      console.error(`Public RPC check failed: ${error.message}`);
    }
    
    // Try ETH_CALL to check if the address is a contract
    try {
      console.log(`\nChecking if address is a contract:`);
      const code = await fetchJsonRpc('eth_getCode', [address, 'latest'], SEPOLIA_RPC_URL);
      if (code === '0x') {
        console.log(`Address is a normal account (not a contract)`);
      } else {
        console.log(`Address is a contract with code: ${code.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error(`Contract check failed: ${error.message}`);
    }
    
    return alchemyBalance;
  } catch (error) {
    console.error(`Balance check failed: ${error.message}`);
    throw error;
  }
}

// Create a simple transaction to check response (this doesn't send anything)
async function testCreateTransaction(privateKey, address) {
  try {
    console.log('\n=== TRANSACTION CREATION TEST ===');
    
    // Get transaction parameters
    const nonceHex = await fetchJsonRpc('eth_getTransactionCount', [address, 'latest']);
    const nonce = parseInt(nonceHex, 16);
    console.log(`Nonce: ${nonce}`);
    
    const gasPriceHex = await fetchJsonRpc('eth_gasPrice', []);
    const gasPrice = BigInt(gasPriceHex);
    console.log(`Gas Price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
    
    // Create transaction data
    const valueWei = BigInt(10000000000000); // 0.00001 ETH
    const gasLimit = BigInt(21000);
    
    const transaction = {
      nonce,
      gasPrice,
      gasLimit,
      to: address, // Self-transfer
      value: valueWei,
      data: '0x',
      chainId: SEPOLIA_CHAIN_ID,
    };
    
    console.log(`Transaction details:`, {
      ...transaction,
      gasPrice: transaction.gasPrice.toString(),
      gasLimit: transaction.gasLimit.toString(),
      value: transaction.value.toString(),
    });
    
    // Test estimate gas call to see if the provider accepts our parameters
    try {
      console.log('\nTesting gas estimation:');
      const estimatedGasHex = await fetchJsonRpc('eth_estimateGas', [{
        from: address,
        to: address,
        value: '0x' + valueWei.toString(16),
        data: '0x'
      }]);
      console.log(`Estimated gas: ${BigInt(estimatedGasHex)}`);
    } catch (error) {
      console.error(`Gas estimation failed: ${error.message}`);
    }
  } catch (error) {
    console.error(`Transaction test failed: ${error.message}`);
  }
}

// Simple diagnostic function
async function diagnoseIssue() {
  try {
    // 1. Verify address derivation
    console.log('\n=== WALLET ADDRESS VERIFICATION ===');
    const derivedAddress = getAddressFromPrivateKey(TEST_PRIVATE_KEY);
    console.log(`Derived address: ${derivedAddress}`);
    console.log(`Expected address: ${TEST_ADDRESS}`);
    
    if (derivedAddress.toLowerCase() !== TEST_ADDRESS.toLowerCase()) {
      throw new Error('Address derivation failed');
    }
    console.log('✅ Address verification successful');
    
    // 2. Get balance from multiple sources
    console.log('\n=== BALANCE VERIFICATION ===');
    const balance = await checkBalancesOnMultipleEndpoints(TEST_ADDRESS);
    
    // 3. Check upper/lowercase address variations
    console.log('\n=== CASE SENSITIVITY CHECK ===');
    const lowercaseAddress = TEST_ADDRESS.toLowerCase();
    const uppercaseAddress = TEST_ADDRESS.toUpperCase().replace('0X', '0x');
    
    if (lowercaseAddress !== TEST_ADDRESS) {
      console.log(`Checking lowercase address: ${lowercaseAddress}`);
      await checkBalancesOnMultipleEndpoints(lowercaseAddress);
    }
    
    if (uppercaseAddress !== TEST_ADDRESS) {
      console.log(`Checking uppercase address: ${uppercaseAddress}`);
      await checkBalancesOnMultipleEndpoints(uppercaseAddress);
    }
    
    // 4. Check the address directly on Etherscan
    console.log('\n=== ETHERSCAN VERIFICATION ===');
    console.log(`To verify your balance, check this address on Etherscan:`);
    console.log(`https://sepolia.etherscan.io/address/${TEST_ADDRESS}`);
    
    // 5. Test transaction creation
    await testCreateTransaction(TEST_PRIVATE_KEY, TEST_ADDRESS);
    
    console.log('\n=== DIAGNOSIS COMPLETE ===');
    console.log('Check the results above to identify any discrepancies');
    
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
  }
}

diagnoseIssue().catch(error => {
  console.error('Script failed:', error);
}); 