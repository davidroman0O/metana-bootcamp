// TypeScript test for the wallet implementation
// Run with: npx tsx src/tests/test-wallet.ts

import * as dotenv from 'dotenv';

dotenv.config();

import {
  getAddressFromPrivateKey,
  getBalance,
  getNonce,
  getGasPrice,
  prepareTransaction,
  signTransaction,
  sendRawTransaction,
  getTransactionUrl
} from '../lib/wallet';
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils';
import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { SEPOLIA_CONFIG } from '../config';
import { RawTransaction } from '../types';

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';

if (!TEST_PRIVATE_KEY) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please make sure TEST_PRIVATE_KEY is set in your .env file.');
  process.exit(1);
}

// Directly derive the address to double-check our implementation
function deriveAddressDirectly(privateKeyHex: string): string {
  // Remove '0x' prefix if present
  privateKeyHex = privateKeyHex.replace(/^0x/, '');
  
  // Convert to bytes
  const privateKeyBytes = hexToBytes(privateKeyHex);
  
  // Get public key
  const publicKeyUncompressed = secp256k1.getPublicKey(privateKeyBytes);
  
  // Remove the first byte (0x04 prefix for uncompressed keys)
  const publicKeyBytes = publicKeyUncompressed.slice(1);
  
  // Hash with keccak-256
  const addressBytes = keccak256(publicKeyBytes).slice(-20);
  
  // Convert to hex string with 0x prefix
  return '0x' + bytesToHex(addressBytes);
}

// derivation (using 0x prefix)
function deriveAddressWithPrefix(privateKeyHex: string): string {
  // Ensure there's a 0x prefix
  if (!privateKeyHex.startsWith('0x')) {
    privateKeyHex = '0x' + privateKeyHex;
  }
  
  // The rest is the same
  const privateKeyBytes = hexToBytes(privateKeyHex.slice(2)); // Remove 0x again for bytes
  const publicKeyUncompressed = secp256k1.getPublicKey(privateKeyBytes);
  const publicKeyBytes = publicKeyUncompressed.slice(1);
  const addressBytes = keccak256(publicKeyBytes).slice(-20);
  return '0x' + bytesToHex(addressBytes);
}

// Helper function to wait/sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runWalletTest() {
  try {
    console.log('\n=== ADDRESS DERIVATION TEST ===');
    
    const addressLib = getAddressFromPrivateKey(TEST_PRIVATE_KEY);
    const addressDirect = deriveAddressDirectly(TEST_PRIVATE_KEY);
    const addressWithPrefix = deriveAddressWithPrefix(TEST_PRIVATE_KEY);
    
    console.log('Library address derivation:        ', addressLib);
    console.log('Direct address derivation:         ', addressDirect);
    console.log('Address with 0x prefix derivation: ', addressWithPrefix);
    
    const web3Address = process.env.TEST_ADDRESS || '';
    if (web3Address) {
      console.log('Web3.js derived address:           ', web3Address);
    } else {
      console.log('Expected address not found in .env file.');
    }
    
    console.log('\n=== BALANCE CHECK ===');
    console.log('Checking balances for each derived address...');
    
    try {
      const balanceLib = await getBalance(addressLib);
      console.log(`Balance for ${addressLib}:  ${balanceLib} wei (${Number(balanceLib) / 1e18} ETH)`);
      
      // Only proceed with transaction tests if we have some balance
      if (balanceLib > BigInt(0)) {
        await runTransactionTests(addressLib);
      } else {
        console.log('\nSkipping transaction tests as account has no funds.');
      }
    } catch (e: any) {
      console.error(`Error checking balance for ${addressLib}: ${e.message}`);
    }
    
    try {
      const balanceDirect = await getBalance(addressDirect);
      console.log(`Balance for ${addressDirect}:  ${balanceDirect} wei (${Number(balanceDirect) / 1e18} ETH)`);
    } catch (e: any) {
      console.error(`Error checking balance for ${addressDirect}: ${e.message}`);
    }
    
    if (web3Address) {
      try {
        const balanceWeb3 = await getBalance(web3Address);
        console.log(`Balance for ${web3Address}:  ${balanceWeb3} wei (${Number(balanceWeb3) / 1e18} ETH)`);
      } catch (e: any) {
        console.error(`Error checking balance for ${web3Address}: ${e.message}`);
      }
    }
    
    console.log('\n=== CONCLUSION ===');
    console.log('The issue might be:');
    console.log('1. The private key generates a different address than expected');
    console.log('2. The balance check shows funds, but transaction sending uses a different address');
    console.log('3. Please verify the addresses above and ensure the one with funds is used for transactions');
    
  } catch (error: any) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', error.message);
  }
}

async function runTransactionTests(address: string) {
  try {
    console.log('\n=== TRANSACTION TESTS ===');
    console.log('Testing both legacy and EIP-1559 transaction formats');
    
    // Get current gas price and nonce
    const gasPrice = await getGasPrice();
    console.log(`Raw gas price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
    
    console.log('Waiting 12 seconds for nonce synchronization...');
    await sleep(12000);
    
    const nonce = await getNonce(address);
    console.log(`Current nonce: ${nonce}`);
    
    // Small transaction value (1 wei)
    const MIN_VALUE = BigInt(1);
    
    // Calculate gas parameters
    const gasMultiplier = 5.0; // Use 5x gas price
    const adjustedGasPrice = BigInt(Math.floor(Number(gasPrice) * gasMultiplier));
    
    // For EIP-1559
    const baseFeeEstimate = BigInt(Math.floor(Number(gasPrice) * 0.9)); // 90% as base fee
    const priorityFee = BigInt(Math.floor(Number(gasPrice) * 0.1));     // 10% as priority
    const maxFeePerGas = BigInt(Math.floor(Number(gasPrice) * gasMultiplier));
    
    console.log(`Adjusted gas price: ${adjustedGasPrice} wei (${Number(adjustedGasPrice) / 1e9} Gwei)`);
    console.log(`Base fee estimate: ${baseFeeEstimate} wei (${Number(baseFeeEstimate) / 1e9} Gwei)`);
    console.log(`Priority fee: ${priorityFee} wei (${Number(priorityFee) / 1e9} Gwei)`);
    console.log(`Max fee per gas: ${maxFeePerGas} wei (${Number(maxFeePerGas) / 1e9} Gwei)`);
    
    // Use standard gas limit for ETH transfer
    const gasLimit = BigInt(21000);
    
    // =========== LEGACY TRANSACTION TEST ===========
    console.log('\n=== LEGACY TRANSACTION TEST ===');
    
    // Use different nonce offsets to avoid conflicts
    const legacyNonce = nonce + 25; // Higher offset than other tests
    console.log(`Using legacy nonce: ${legacyNonce} (nonce+25)`);
    
    // Create a legacy transaction
    const legacyTx: RawTransaction = {
      nonce: legacyNonce,
      gasPrice: adjustedGasPrice,
      gasLimit,
      to: address, // Self-transfer
      value: MIN_VALUE,
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
      type: 'legacy'
    };
    
    // Calculate cost
    const legacyGasCost = legacyTx.gasPrice! * legacyTx.gasLimit;
    console.log(`Legacy gas cost: ${legacyGasCost} wei (${Number(legacyGasCost) / 1e18} ETH)`);
    
    try {
      // Prepare and sign transaction
      console.log('Preparing and signing legacy transaction...');
      const preparedLegacyTx = prepareTransaction(legacyTx);
      const signedLegacyTx = signTransaction(preparedLegacyTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
      
      console.log('Legacy transaction signature:');
      console.log(`- v: ${signedLegacyTx.v}`);
      console.log(`- r: ${signedLegacyTx.r.toString().substring(0, 20)}...`);
      console.log(`- s: ${signedLegacyTx.s.toString().substring(0, 20)}...`);
      console.log(`- type: ${signedLegacyTx.type}`);
      
      // Send the transaction
      console.log('Sending legacy transaction...');
      const legacyTxHash = await sendRawTransaction(signedLegacyTx.serialized);
      
      console.log('✅ LEGACY TRANSACTION SUCCESSFUL!');
      console.log(`Transaction hash: ${legacyTxHash}`);
      console.log(`Etherscan: ${getTransactionUrl(legacyTxHash)}`);
      
      // Wait for transaction to be mined
      console.log('Waiting 10 seconds for transaction to be mined...');
      await sleep(10000);
    } catch (error: any) {
      console.error('❌ LEGACY TRANSACTION FAILED:', error.message);
    }
    
    // =========== EIP-1559 TRANSACTION TEST ===========
    console.log('\n=== EIP-1559 TRANSACTION TEST ===');
    
    // Use different nonce for EIP-1559
    const eip1559Nonce = nonce + 26;
    console.log(`Using EIP-1559 nonce: ${eip1559Nonce} (nonce+26)`);
    
    // Create an EIP-1559 transaction
    const eip1559Tx: RawTransaction = {
      nonce: eip1559Nonce,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      gasLimit,
      to: address, // Self-transfer
      value: MIN_VALUE,
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
      type: 'eip1559'
    };
    
    // Calculate maximum cost
    const eip1559GasCost = eip1559Tx.maxFeePerGas! * eip1559Tx.gasLimit;
    console.log(`EIP-1559 max gas cost: ${eip1559GasCost} wei (${Number(eip1559GasCost) / 1e18} ETH)`);
    
    try {
      // Prepare and sign transaction
      console.log('Preparing and signing EIP-1559 transaction...');
      const preparedEip1559Tx = prepareTransaction(eip1559Tx);
      const signedEip1559Tx = signTransaction(preparedEip1559Tx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
      
      console.log('EIP-1559 transaction signature:');
      console.log(`- v: ${signedEip1559Tx.v}`);
      console.log(`- r: ${signedEip1559Tx.r.toString().substring(0, 20)}...`);
      console.log(`- s: ${signedEip1559Tx.s.toString().substring(0, 20)}...`);
      console.log(`- type: ${signedEip1559Tx.type}`);
      console.log(`- starts with 0x02: ${signedEip1559Tx.serialized.startsWith('0x02')}`);
      
      // Send the transaction
      console.log('Sending EIP-1559 transaction...');
      const eip1559TxHash = await sendRawTransaction(signedEip1559Tx.serialized);
      
      console.log('✅ EIP-1559 TRANSACTION SUCCESSFUL!');
      console.log(`Transaction hash: ${eip1559TxHash}`);
      console.log(`Etherscan: ${getTransactionUrl(eip1559TxHash)}`);
      
      // Wait for transaction to be mined
      console.log('Waiting 10 seconds for transaction to be mined...');
      await sleep(10000);
    } catch (error: any) {
      console.error('❌ EIP-1559 TRANSACTION FAILED:', error.message);
    }
    
    // Get final balance
    const finalBalance = await getBalance(address);
    console.log(`\nFinal balance: ${finalBalance} wei (${Number(finalBalance) / 1e18} ETH)`);
    
  } catch (error: any) {
    console.error('\n=== TRANSACTION TESTS FAILED ===');
    console.error('Error:', error.message);
  }
}

runWalletTest().catch(console.error); 