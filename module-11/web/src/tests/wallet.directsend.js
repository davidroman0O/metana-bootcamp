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

// Wait for specified time
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send a legacy transaction (pre EIP-1559)
async function sendLegacyTransaction() {
  try {
    console.log(`\n=== LEGACY TRANSACTION TEST ===`);
    
    // 1. Check current balance
    console.log(`\n=== CHECKING BALANCE ===`);
    const balance = await getBalance(TEST_ADDRESS);
    
    // 2. Add delay to ensure proper nonce synchronization
    console.log(`\n=== WAITING FOR SYNCHRONIZATION (12 SECONDS) ===`);
    await sleep(12000);
    
    // 3. Get nonce
    console.log(`\n=== GETTING NONCE ===`);
    const nonceHex = await fetchJsonRpc('eth_getTransactionCount', [TEST_ADDRESS, 'latest']);
    const nonce = parseInt(nonceHex, 16);
    const legacyNonce = nonce + 35; // High offset to avoid conflicts
    console.log(`Base Nonce: ${nonce}, Using: ${legacyNonce} (nonce+35)`);
    
    // 4. Get gas price
    console.log(`\n=== GETTING GAS PRICE ===`);
    const gasPriceHex = await fetchJsonRpc('eth_gasPrice', []);
    const gasPrice = BigInt(gasPriceHex);
    
    // Use 5x gas price for higher priority
    const gasMultiplier = 5.0;
    const adjustedGasPrice = BigInt(Math.floor(Number(gasPrice) * gasMultiplier));
    
    console.log(`Raw Gas Price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
    console.log(`Adjusted Gas Price: ${adjustedGasPrice} wei (${Number(adjustedGasPrice) / 1e9} Gwei)`);
    
    // 5. Create transaction with VERY SMALL amount (1 wei)
    console.log(`\n=== CREATING LEGACY TRANSACTION ===`);
    const valueWei = BigInt(1); // Just 1 wei!
    const gasLimit = BigInt(21000);
    
    // Calculate cost
    const gasCost = gasLimit * adjustedGasPrice;
    const totalCost = valueWei + gasCost;
    console.log(`Value: ${valueWei} wei`);
    console.log(`Gas Cost: ${gasCost} wei (${Number(gasCost) / 1e18} ETH)`);
    console.log(`Total Cost: ${totalCost} wei (${Number(totalCost) / 1e18} ETH)`);
    
    if (balance < totalCost) {
      throw new Error(`Insufficient funds. Have: ${balance}, Need: ${totalCost}`);
    }
    
    // 6. Prepare transaction for EIP-155 signing (with chainId)
    console.log(`\n=== PREPARING LEGACY TRANSACTION ===`);
    const txData = [
      legacyNonce === 0 ? new Uint8Array([]) : legacyNonce,
      adjustedGasPrice === 0n ? new Uint8Array([]) : adjustedGasPrice,
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
    
    // 7. Sign the transaction
    console.log(`\n=== SIGNING LEGACY TRANSACTION ===`);
    const privateKeyBytes = hexToBytes(TEST_PRIVATE_KEY);
    const signature = secp256k1.sign(messageHash, privateKeyBytes);
    
    // Calculate v value according to EIP-155
    const v = signature.recovery + (SEPOLIA_CHAIN_ID * 2) + 35;
    
    // Create the signed transaction
    const signedTxData = [
      legacyNonce === 0 ? new Uint8Array([]) : legacyNonce,
      adjustedGasPrice === 0n ? new Uint8Array([]) : adjustedGasPrice,
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
    
    console.log(`Signed legacy transaction: ${serializedHex}`);
    
    // 8. Send the transaction
    console.log(`\n=== SENDING LEGACY TRANSACTION ===`);
    const txHash = await fetchJsonRpc('eth_sendRawTransaction', [serializedHex]);
    console.log(`\nLegacy transaction sent! Hash: ${txHash}`);
    console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
    
    // Wait before proceeding
    console.log(`\nWaiting 10 seconds for transaction to be mined...`);
    await sleep(10000);
    
    return txHash;
  } catch (error) {
    console.error(`\nLEGACY TRANSACTION ERROR: ${error.message}`);
    return null;
  }
}

// Send an EIP-1559 transaction
async function sendEIP1559Transaction() {
  try {
    console.log(`\n=== EIP-1559 TRANSACTION TEST ===`);
    
    // 1. Check current balance
    console.log(`\n=== CHECKING BALANCE ===`);
    const balance = await getBalance(TEST_ADDRESS);
    
    // 2. Get nonce
    console.log(`\n=== GETTING NONCE ===`);
    const nonceHex = await fetchJsonRpc('eth_getTransactionCount', [TEST_ADDRESS, 'latest']);
    const nonce = parseInt(nonceHex, 16);
    const eip1559Nonce = nonce + 36; // Different offset than legacy
    console.log(`Base Nonce: ${nonce}, Using: ${eip1559Nonce} (nonce+36)`);
    
    // 3. Get gas price for EIP-1559 parameters
    console.log(`\n=== GETTING GAS PARAMETERS ===`);
    const gasPriceHex = await fetchJsonRpc('eth_gasPrice', []);
    const gasPrice = BigInt(gasPriceHex);
    
    // Calculate EIP-1559 parameters
    const baseFeeEstimate = BigInt(Math.floor(Number(gasPrice) * 0.9)); // 90% of current gas price as base fee
    const priorityFee = BigInt(Math.floor(Number(gasPrice) * 0.1)); // 10% as priority fee
    
    // Use 5x multiplier for max fee to ensure acceptance
    const gasMultiplier = 5.0;
    const maxFeePerGas = BigInt(Math.floor(Number(gasPrice) * gasMultiplier));
    
    console.log(`Raw Gas Price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
    console.log(`Base Fee Estimate: ${baseFeeEstimate} wei (${Number(baseFeeEstimate) / 1e9} Gwei)`);
    console.log(`Priority Fee: ${priorityFee} wei (${Number(priorityFee) / 1e9} Gwei)`);
    console.log(`Max Fee Per Gas: ${maxFeePerGas} wei (${Number(maxFeePerGas) / 1e9} Gwei)`);
    
    // 4. Create transaction with VERY SMALL amount (1 wei)
    console.log(`\n=== CREATING EIP-1559 TRANSACTION ===`);
    const valueWei = BigInt(1); // Just 1 wei!
    const gasLimit = BigInt(21000);
    
    // Calculate maximum cost (worst case)
    const maxGasCost = gasLimit * maxFeePerGas;
    const totalMaxCost = valueWei + maxGasCost;
    console.log(`Value: ${valueWei} wei`);
    console.log(`Max Gas Cost: ${maxGasCost} wei (${Number(maxGasCost) / 1e18} ETH)`);
    console.log(`Max Total Cost: ${totalMaxCost} wei (${Number(totalMaxCost) / 1e18} ETH)`);
    
    if (balance < totalMaxCost) {
      throw new Error(`Insufficient funds. Have: ${balance}, Need: ${totalMaxCost}`);
    }
    
    // 5. Prepare EIP-1559 transaction
    console.log(`\n=== PREPARING EIP-1559 TRANSACTION ===`);
    
    // Format values for RLP encoding
    const chainIdBytes = hexToBytes(SEPOLIA_CHAIN_ID.toString(16).padStart(2, '0'));
    const nonceBytes = hexToBytes(eip1559Nonce.toString(16));
    const maxPriorityFeeBytes = hexToBytes(priorityFee.toString(16));
    const maxFeeBytes = hexToBytes(maxFeePerGas.toString(16));
    const gasLimitBytes = hexToBytes(gasLimit.toString(16));
    const valueBytes = hexToBytes(valueWei.toString(16));
    const dataBytes = hexToBytes(''); // Empty data
    
    // EIP-1559 transaction fields (according to EIP-2718 format)
    const txPayload = [
      chainIdBytes,
      nonceBytes,
      maxPriorityFeeBytes,
      maxFeeBytes,
      gasLimitBytes,
      hexToBytes(TEST_ADDRESS.slice(2)), // To address without 0x
      valueBytes,
      dataBytes,
      [] // Access list (empty)
    ];
    
    // RLP encode the transaction payload
    const rlpEncoded = RLP.encode(txPayload);
    
    // Prefixed with transaction type (0x02 for EIP-1559)
    const encodedTx = new Uint8Array(1 + rlpEncoded.length);
    encodedTx[0] = 2; // EIP-1559 transaction type (0x02)
    encodedTx.set(rlpEncoded, 1);
    
    // Hash for signing is keccak256 of the entire typed transaction
    const messageHash = keccak256(encodedTx);
    console.log(`EIP-1559 transaction hash for signing: ${bytesToHex(messageHash)}`);
    
    // 6. Sign the transaction
    console.log(`\n=== SIGNING EIP-1559 TRANSACTION ===`);
    const privateKeyBytes = hexToBytes(TEST_PRIVATE_KEY);
    const signature = secp256k1.sign(messageHash, privateKeyBytes);
    
    // For EIP-1559, v is just the recovery bit (0 or 1), not adjusted with chainId
    const v = signature.recovery;
    
    // Create the signed EIP-1559 transaction
    // Add signature fields to the transaction payload
    const signedTxPayload = [
      ...txPayload, // Original transaction fields
      new Uint8Array([v]), // v (0 or 1)
      signature.r,  // r
      signature.s   // s
    ];
    
    // RLP encode the signed payload
    const signedRlpEncoded = RLP.encode(signedTxPayload);
    
    // Prefix with transaction type
    const signedEncodedTx = new Uint8Array(1 + signedRlpEncoded.length);
    signedEncodedTx[0] = 2; // EIP-1559 type
    signedEncodedTx.set(signedRlpEncoded, 1);
    
    const serializedHex = '0x' + bytesToHex(signedEncodedTx);
    console.log(`Signed EIP-1559 transaction: ${serializedHex}`);
    
    // Verify the transaction starts with 0x02 (EIP-1559 identifier)
    if (!serializedHex.startsWith('0x02')) {
      console.warn('WARNING: Transaction does not start with 0x02, which is required for EIP-1559');
    }
    
    // 7. Send the transaction
    console.log(`\n=== SENDING EIP-1559 TRANSACTION ===`);
    const txHash = await fetchJsonRpc('eth_sendRawTransaction', [serializedHex]);
    console.log(`\nEIP-1559 transaction sent! Hash: ${txHash}`);
    console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
    
    return txHash;
  } catch (error) {
    console.error(`\nEIP-1559 TRANSACTION ERROR: ${error.message}`);
    return null;
  }
}

// Main function to run both transaction types
async function sendTinyTransactions() {
  try {
    console.log('=== WALLET DIRECTSEND DUAL TRANSACTION TEST ===');
    console.log('This will test both legacy and EIP-1559 transaction formats');
    
    // First send a legacy transaction
    const legacyTxHash = await sendLegacyTransaction();
    
    // Then send an EIP-1559 transaction
    const eip1559TxHash = await sendEIP1559Transaction();
    
    // Summary
    console.log('\n=== TRANSACTION TEST SUMMARY ===');
    console.log('Legacy transaction:', legacyTxHash ? 'SUCCESS' : 'FAILED');
    console.log('EIP-1559 transaction:', eip1559TxHash ? 'SUCCESS' : 'FAILED');
    
    // Final balance
    const finalBalance = await getBalance(TEST_ADDRESS);
    console.log(`Final balance: ${finalBalance} wei (${Number(finalBalance) / 1e18} ETH)`);
    
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
  }
}

sendTinyTransactions().catch(error => {
  console.error('Script failed:', error);
}); 