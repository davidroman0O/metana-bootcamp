// Simple script to try sending a very small amount
// Run with: node src/tests/wallet.directsend.js

const { keccak256 } = require('ethereum-cryptography/keccak');
const { secp256k1 } = require('ethereum-cryptography/secp256k1');
const { hexToBytes, bytesToHex } = require('ethereum-cryptography/utils');
const { RLP } = require('@ethereumjs/rlp');
const dotenv = require('dotenv');

dotenv.config();

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const TEST_ADDRESS = process.env.TEST_ADDRESS || '';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const SEPOLIA_CHAIN_ID = 11155111;

if (!TEST_PRIVATE_KEY || !TEST_ADDRESS) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please make sure TEST_PRIVATE_KEY and TEST_ADDRESS are set in your .env file.');
  process.exit(1);
}

async function fetchJsonRpc(method, params = []) {
  try {
    console.log(`Making RPC call: ${method}`, JSON.stringify(params, null, 2));
    const response = await fetch(SEPOLIA_RPC_URL, {
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
    console.log(`RPC Response:`, JSON.stringify(data, null, 2));

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result;
  } catch (error) {
    console.error(`RPC Fetch Error: ${error.message}`);
    throw error;
  }
}

// Get balance
async function getBalance(address) {
  console.log(`Checking balance for address: ${address}`);
  const balanceHex = await fetchJsonRpc('eth_getBalance', [address, 'latest']);
  const balance = BigInt(balanceHex);
  console.log(`Balance: ${balance} wei (${Number(balance) / 1e18} ETH)`);
  return balance;
}

// Simple test function to send a very tiny amount
async function sendTinyTransaction() {
  try {
    // 1. Check current balance
    console.log(`\n=== CHECKING BALANCE ===`);
    const balance = await getBalance(TEST_ADDRESS);
    
    // 2. Get nonce
    console.log(`\n=== GETTING NONCE ===`);
    const nonceHex = await fetchJsonRpc('eth_getTransactionCount', [TEST_ADDRESS, 'latest']);
    const nonce = parseInt(nonceHex, 16);
    console.log(`Nonce: ${nonce}`);
    
    // 3. Get gas price
    console.log(`\n=== GETTING GAS PRICE ===`);
    const gasPriceHex = await fetchJsonRpc('eth_gasPrice', []);
    const gasPrice = BigInt(gasPriceHex);
    console.log(`Gas Price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
    
    // 4. Create transaction with VERY SMALL amount (1 wei)
    console.log(`\n=== CREATING MINIMAL TRANSACTION ===`);
    const valueWei = BigInt(1); // Just 1 wei!
    const gasLimit = BigInt(21000);
    
    // Calculate cost
    const gasCost = gasLimit * gasPrice;
    const totalCost = valueWei + gasCost;
    console.log(`Value: ${valueWei} wei`);
    console.log(`Gas Cost: ${gasCost} wei (${Number(gasCost) / 1e18} ETH)`);
    console.log(`Total Cost: ${totalCost} wei (${Number(totalCost) / 1e18} ETH)`);
    
    if (balance < totalCost) {
      throw new Error(`Insufficient funds. Have: ${balance}, Need: ${totalCost}`);
    }
    
    // 5. Prepare transaction
    console.log(`\n=== PREPARING TRANSACTION ===`);
    const txData = [
      nonce === 0 ? new Uint8Array([]) : nonce,
      gasPrice === 0n ? new Uint8Array([]) : gasPrice,
      gasLimit === 0n ? new Uint8Array([]) : gasLimit,
      hexToBytes(TEST_ADDRESS.slice(2)), // Remove 0x
      valueWei === 0n ? new Uint8Array([]) : valueWei,
      hexToBytes(''), // Empty data
      SEPOLIA_CHAIN_ID,
      new Uint8Array([]), // v
      new Uint8Array([]), // r
      new Uint8Array([]), // s
    ];
    
    const encodedTx = RLP.encode(txData);
    const messageHash = keccak256(encodedTx);
    console.log(`Transaction hash for signing: ${bytesToHex(messageHash)}`);
    
    // 6. Sign the transaction
    console.log(`\n=== SIGNING TRANSACTION ===`);
    const privateKeyBytes = hexToBytes(TEST_PRIVATE_KEY);
    const signature = secp256k1.sign(messageHash, privateKeyBytes);
    
    // Calculate v value according to EIP-155
    const v = signature.recovery + (SEPOLIA_CHAIN_ID * 2) + 35;
    
    // Create the signed transaction
    const signedTxData = [
      nonce === 0 ? new Uint8Array([]) : nonce,
      gasPrice === 0n ? new Uint8Array([]) : gasPrice,
      gasLimit === 0n ? new Uint8Array([]) : gasLimit,
      hexToBytes(TEST_ADDRESS.slice(2)), // Remove 0x
      valueWei === 0n ? new Uint8Array([]) : valueWei,
      hexToBytes(''), // Empty data
      v,
      signature.r,
      signature.s,
    ];
    
    const signedTxBytes = RLP.encode(signedTxData);
    const serializedHex = '0x' + bytesToHex(signedTxBytes);
    
    console.log(`Signed transaction: ${serializedHex}`);
    
    // 7. Send the transaction
    console.log(`\n=== SENDING TRANSACTION ===`);
    const txHash = await fetchJsonRpc('eth_sendRawTransaction', [serializedHex]);
    console.log(`\nTransaction sent! Hash: ${txHash}`);
    console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
    
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
  }
}

sendTinyTransaction().catch(error => {
  console.error('Script failed:', error);
}); 