// Simple test script to verify the fixed wallet implementation
// Run with: npx tsx src/tests/simple.transfer.test.ts

import * as dotenv from 'dotenv';
dotenv.config();

import {
  getAddressFromPrivateKey,
  getBalance,
  getNonce,
  getGasPrice,
  prepareTransaction,
  signTransaction,
  sendRawTransaction
} from '../lib/wallet';
import { RawTransaction } from '../types';
import { SEPOLIA_CONFIG } from '../config';

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const TEST_ADDRESS = process.env.TEST_ADDRESS || '';

if (!TEST_PRIVATE_KEY || !TEST_ADDRESS) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please make sure TEST_PRIVATE_KEY and TEST_ADDRESS are set in your .env file.');
  process.exit(1);
}

// Small transaction amount (1 wei)
const TRANSACTION_WEI = BigInt(1);

async function runTransactionTest() {
  try {
    console.log('\n=== ADDRESS VERIFICATION ===');
    const derivedAddress = getAddressFromPrivateKey(TEST_PRIVATE_KEY);
    console.log(`Derived address: ${derivedAddress}`);
    console.log(`Expected address: ${TEST_ADDRESS}`);
    
    if (derivedAddress.toLowerCase() !== TEST_ADDRESS.toLowerCase()) {
      throw new Error('Address derivation mismatch!');
    }
    console.log('✅ Address verification successful');
    
    console.log('\n=== BALANCE CHECK ===');
    const balance = await getBalance(derivedAddress);
    console.log(`Balance: ${balance} wei (${Number(balance) / 1e18} ETH)`);
    
    if (balance === 0n || balance < BigInt(21000)) {
      console.error('❌ Insufficient balance to execute transaction. Please fund the wallet.');
      return;
    }
    console.log('✅ Sufficient balance found');
    
    // Get gas price once for both transaction types
    console.log('\n=== GAS PRICE CHECK ===');
    const rawGasPrice = await getGasPrice();
    console.log(`Raw Gas Price: ${rawGasPrice} wei (${Number(rawGasPrice) / 1e9} Gwei)`);
    
    // Add a proper delay to ensure nonce synchronization
    console.log('Waiting for nonce synchronization (12 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 12000)); // Wait 12 seconds
    
    // Get the current nonce right before creating the transaction
    const nonce = await getNonce(derivedAddress);
    console.log('Current nonce:', nonce);
    
    // ------------------------
    // LEGACY TRANSACTION
    // ------------------------
    console.log('\n=== LEGACY TRANSACTION TEST ===');
    console.log('=== TRANSACTION PREPARATION ===');
    
    // Use a larger increment to avoid conflicts with pending transactions
    const legacyNonceToUse = nonce + 20;  // Use different offset than EIP-1559 test
    console.log(`Using nonce: ${legacyNonceToUse} (nonce+20 to avoid pending transaction conflicts)`);
    
    // Set gas price to a much higher value to ensure the transaction goes through
    // Use 5x the current gas price to ensure transaction acceptance
    const gasPercentage = 5.0; // 500% of current gas price
    const adjustedGasPrice = BigInt(Math.floor(Number(rawGasPrice) * gasPercentage));
    
    console.log(`Adjusted Gas Price: ${adjustedGasPrice} wei (${Number(adjustedGasPrice) / 1e9} Gwei)`);
    
    // Create a legacy transaction (self-transfer of 1 wei to minimize costs)
    const legacyTx: RawTransaction = {
      nonce: legacyNonceToUse, // Use the incremented nonce
      gasPrice: adjustedGasPrice,
      gasLimit: BigInt(21000), // Standard ETH transfer gas limit
      to: derivedAddress, // Self-transfer
      value: TRANSACTION_WEI,
      data: '0x', // No data (simple ETH transfer)
      chainId: SEPOLIA_CONFIG.chainId, // Use the correct chain ID
      type: 'legacy' // Explicitly set to legacy
    };
    
    // Calculate gas cost
    const legacyGasCost = legacyTx.gasPrice! * legacyTx.gasLimit;
    console.log(`Gas cost: ${legacyGasCost} wei (${Number(legacyGasCost) / 1e18} ETH)`);
    console.log(`Total cost: ${legacyGasCost + legacyTx.value} wei`);
    
    // Check if we have enough balance for the transaction
    if (balance < (legacyGasCost + legacyTx.value)) {
      console.error(`❌ Insufficient balance. Have ${balance} wei, need ${legacyGasCost + legacyTx.value} wei.`);
      return;
    }
    console.log('✅ Sufficient balance for legacy transaction');
    
    console.log('\n=== LEGACY TRANSACTION SIGNING ===');
    const preparedLegacyTx = prepareTransaction(legacyTx);
    const signedLegacyTx = signTransaction(preparedLegacyTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    console.log('Signed legacy transaction details:');
    console.log('- v:', signedLegacyTx.v);
    console.log('- r:', signedLegacyTx.r.toString().substring(0, 20) + '...');
    console.log('- s:', signedLegacyTx.s.toString().substring(0, 20) + '...');
    console.log('- serialized:', signedLegacyTx.serialized.substring(0, 40) + '...');
    
    console.log('\n=== SENDING LEGACY TRANSACTION ===');
    console.log('Sending legacy transaction...');
    
    // Print complete transaction details for debugging
    console.log('Legacy Transaction Details:');
    console.log(JSON.stringify({
      nonce: legacyTx.nonce,
      gasPrice: legacyTx.gasPrice!.toString(),
      gasLimit: legacyTx.gasLimit.toString(),
      to: legacyTx.to,
      value: legacyTx.value.toString(),
      data: legacyTx.data,
      chainId: legacyTx.chainId,
      type: legacyTx.type
    }, null, 2));
    
    try {
      const legacyTxHash = await sendRawTransaction(signedLegacyTx.serialized);
      
      console.log('\n✅ LEGACY TRANSACTION SENT SUCCESSFULLY!');
      console.log(`Transaction hash: ${legacyTxHash}`);
      console.log(`View on Etherscan: ${SEPOLIA_CONFIG.blockExplorer}/tx/${legacyTxHash}`);
      
      console.log('\nWaiting for legacy transaction to be mined (10 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const intermBalance = await getBalance(derivedAddress);
      console.log(`Balance after legacy transaction: ${intermBalance} wei (${Number(intermBalance) / 1e18} ETH)`);
      console.log(`Spent: ${balance - intermBalance} wei`);
    } catch (error: any) {
      console.error('\n❌ LEGACY TRANSACTION FAILED');
      console.error('Error:', error.message);
      return; // Stop if legacy transaction fails
    }
    
    // ------------------------
    // EIP-1559 TRANSACTION
    // ------------------------
    console.log('\n=== EIP-1559 TRANSACTION TEST ===');
    console.log('=== EIP-1559 TRANSACTION PREPARATION ===');
    
    // Use a different nonce than the legacy transaction
    const eip1559NonceToUse = nonce + 21;  // Use nonce+21 to avoid conflict with legacy tx
    console.log(`Using nonce: ${eip1559NonceToUse} (nonce+21 to avoid conflicts)`);
    
    // For EIP-1559 we need to calculate maxFeePerGas and maxPriorityFeePerGas
    const estimatedBaseFee = BigInt(Math.floor(Number(rawGasPrice) * 0.9)); // 90% of gas price as base fee estimate
    const priorityFee = BigInt(Math.floor(Number(rawGasPrice) * 0.1)); // 10% as priority fee
    
    // Use a higher multiplier for maxFeePerGas to ensure transaction goes through
    const maxFeePerGas = BigInt(Math.floor(Number(rawGasPrice) * gasPercentage));
    
    console.log(`Estimated Base Fee: ${estimatedBaseFee} wei (${Number(estimatedBaseFee) / 1e9} Gwei)`);
    console.log(`Priority Fee: ${priorityFee} wei (${Number(priorityFee) / 1e9} Gwei)`);
    console.log(`Max Fee Per Gas: ${maxFeePerGas} wei (${Number(maxFeePerGas) / 1e9} Gwei)`);
    
    // Create an EIP-1559 transaction
    const eip1559Tx: RawTransaction = {
      nonce: eip1559NonceToUse,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      gasLimit: BigInt(21000), // Standard ETH transfer gas limit
      to: derivedAddress, // Self-transfer
      value: TRANSACTION_WEI,
      data: '0x', // No data (simple ETH transfer)
      chainId: SEPOLIA_CONFIG.chainId,
      type: 'eip1559' // Explicitly set type to EIP-1559
    };
    
    // Calculate maximum gas cost (worst case)
    const eip1559GasCost = eip1559Tx.maxFeePerGas! * eip1559Tx.gasLimit;
    console.log(`Max Gas cost: ${eip1559GasCost} wei (${Number(eip1559GasCost) / 1e18} ETH)`);
    console.log(`Total max cost: ${eip1559GasCost + eip1559Tx.value} wei`);
    
    // Get updated balance
    const updatedBalance = await getBalance(derivedAddress);
    
    // Check if we have enough balance for the transaction
    if (updatedBalance < (eip1559GasCost + eip1559Tx.value)) {
      console.error(`❌ Insufficient balance. Have ${updatedBalance} wei, need ${eip1559GasCost + eip1559Tx.value} wei.`);
      return;
    }
    console.log('✅ Sufficient balance for EIP-1559 transaction');
    
    console.log('\n=== EIP-1559 TRANSACTION SIGNING ===');
    const preparedEip1559Tx = prepareTransaction(eip1559Tx);
    const signedEip1559Tx = signTransaction(preparedEip1559Tx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    console.log('Signed EIP-1559 transaction details:');
    console.log('- v:', signedEip1559Tx.v);
    console.log('- r:', signedEip1559Tx.r.toString().substring(0, 20) + '...');
    console.log('- s:', signedEip1559Tx.s.toString().substring(0, 20) + '...');
    console.log('- type:', signedEip1559Tx.type);
    console.log('- serialized:', signedEip1559Tx.serialized.substring(0, 40) + '...');
    console.log('- starts with 0x02:', signedEip1559Tx.serialized.startsWith('0x02')); // EIP-1559 should start with 0x02
    
    console.log('\n=== SENDING EIP-1559 TRANSACTION ===');
    console.log('Sending EIP-1559 transaction...');
    
    // Print complete transaction details for debugging
    console.log('EIP-1559 Transaction Details:');
    console.log(JSON.stringify({
      nonce: eip1559Tx.nonce,
      maxFeePerGas: eip1559Tx.maxFeePerGas!.toString(),
      maxPriorityFeePerGas: eip1559Tx.maxPriorityFeePerGas!.toString(),
      gasLimit: eip1559Tx.gasLimit.toString(),
      to: eip1559Tx.to,
      value: eip1559Tx.value.toString(),
      data: eip1559Tx.data,
      chainId: eip1559Tx.chainId,
      type: eip1559Tx.type
    }, null, 2));
    
    try {
      const eip1559TxHash = await sendRawTransaction(signedEip1559Tx.serialized);
      
      console.log('\n✅ EIP-1559 TRANSACTION SENT SUCCESSFULLY!');
      console.log(`Transaction hash: ${eip1559TxHash}`);
      console.log(`View on Etherscan: ${SEPOLIA_CONFIG.blockExplorer}/tx/${eip1559TxHash}`);
      
      console.log('\nWaiting for EIP-1559 transaction to be mined (10 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const newBalance = await getBalance(derivedAddress);
      console.log(`Final balance: ${newBalance} wei (${Number(newBalance) / 1e18} ETH)`);
      console.log(`Total spent: ${balance - newBalance} wei`);
    } catch (error: any) {
      console.error('\n❌ EIP-1559 TRANSACTION FAILED');
      console.error('Error:', error.message);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Error details:', error);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\nPossible solution: The account may not have enough funds for gas.');
      console.log('Check on Etherscan: https://sepolia.etherscan.io/address/' + TEST_ADDRESS);
    } else if (error.message.includes('replacement transaction underpriced')) {
      console.log('\nPossible solution: The gas price is too low. Try increasing it.');
      console.log('Check current gas prices at: https://owlracle.info/sepolia');
    } else if (error.message.includes('nonce too low')) {
      console.log('\nPossible solution: The nonce is already used. Try incrementing it manually.');
    }
  }
}

runTransactionTest().catch(error => {
  console.error('Unhandled error:', error);
}); 