// Test for EIP-1559 transactions
// Run with: npx tsx src/tests/eip1559.transaction.test.ts

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

async function runEIP1559TransactionTest() {
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
    
    console.log('\n=== TRANSACTION PREPARATION ===');
    const rawGasPrice = await getGasPrice();
    
    // Add a proper delay to ensure nonce synchronization
    console.log('Waiting for nonce synchronization (12 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 12000)); // Wait 12 seconds
    
    // Get the most up-to-date nonce right before creating the transaction
    const nonce = await getNonce(derivedAddress);
    console.log('Current nonce:', nonce);
    
    // Use a larger increment to avoid conflicts with pending transactions
    const nonceToUse = nonce + 10;
    console.log('Using nonce:', nonceToUse, '(nonce+10 to avoid pending transaction conflicts)');
    
    // For EIP-1559 transactions, we need maxFeePerGas and maxPriorityFeePerGas
    // We'll estimate the base fee and add a priority fee on top
    const estimatedBaseFee = BigInt(Math.floor(Number(rawGasPrice) * 0.9)); // 90% of gas price as base fee estimate
    const priorityFee = BigInt(Math.floor(Number(rawGasPrice) * 0.1)); // 10% as priority fee
    
    // We'll use a higher multiplier to make sure the transaction is accepted
    const gasPriceMultiplier = 5.0; // 5x the gas price for higher priority
    const maxFeePerGas = BigInt(Math.floor(Number(rawGasPrice) * gasPriceMultiplier)) - 1n;
    
    // Max fee is the absolute maximum you're willing to pay per gas unit
    // It should be at least baseFee + priorityFee
    const maxFee = estimatedBaseFee + priorityFee;
    
    console.log(`Nonce: ${nonce}`);
    console.log(`Estimated Base Fee: ${estimatedBaseFee} wei (${Number(estimatedBaseFee) / 1e9} Gwei)`);
    console.log(`Priority Fee: ${priorityFee} wei (${Number(priorityFee) / 1e9} Gwei)`);
    console.log(`Max Fee: ${maxFeePerGas} wei (${Number(maxFeePerGas) / 1e9} Gwei)`);
    
    // Calculate max transaction cost (maxFeePerGas * gasLimit)
    const maxGasCost = maxFeePerGas * BigInt(21000);
    const totalMaxCost = maxGasCost + BigInt(1); // Gas cost + value (1 wei)
    
    console.log(`Max Gas cost: ${maxGasCost} wei (${Number(maxGasCost) / 1e18} ETH)`);
    console.log(`Total max cost: ${totalMaxCost} wei`);
    
    // Make sure we have enough funds
    if (balance < totalMaxCost) {
      throw new Error(`Insufficient balance. Have ${balance} wei, need ${totalMaxCost} wei`);
    }
    console.log('✅ Sufficient balance for the transaction');
    
    // Create an EIP-1559 transaction (self-transfer of 1 wei)
    const tx: RawTransaction = {
      nonce: nonceToUse,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      gasLimit: BigInt(21000), // Standard ETH transfer gas limit
      to: derivedAddress, // Self-transfer
      value: TRANSACTION_WEI,
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
      type: 'eip1559'
    };
    
    console.log('\n=== TRANSACTION SIGNING ===');
    const preparedTx = prepareTransaction(tx);
    const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    console.log('Signed transaction details:');
    console.log('- v:', signedTx.v);
    console.log('- r:', signedTx.r.toString());
    console.log('- s:', signedTx.s.toString());
    console.log('- type:', signedTx.type);
    console.log('- serialized:', signedTx.serialized);
    
    console.log('\n=== SENDING TRANSACTION ===');
    console.log('Sending transaction...');
    
    // Print complete transaction details for debugging
    console.log('Transaction Details:');
    console.log(JSON.stringify({
      nonce: tx.nonce,
      maxFeePerGas: tx.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
      gasLimit: tx.gasLimit.toString(),
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data,
      chainId: tx.chainId,
      type: tx.type
    }, null, 2));
    
    // Add more detailed debugging info
    console.log('\nTransaction hex data breakdown:');
    console.log('Serialized tx hex:', signedTx.serialized);
    console.log('Hex length:', signedTx.serialized.length - 2); // subtract 2 for '0x' prefix
    // Extract the first bytes to check transaction type
    console.log('First bytes (including type):', signedTx.serialized.substring(0, 10));
    
    try {
      const txHash = await sendRawTransaction(signedTx.serialized);
      
      console.log('\n✅ TRANSACTION SENT SUCCESSFULLY!');
      console.log(`Transaction hash: ${txHash}`);
      console.log(`View on Etherscan: ${SEPOLIA_CONFIG.blockExplorer}/tx/${txHash}`);
      
      console.log('\nWaiting for transaction to be mined...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const newBalance = await getBalance(derivedAddress);
      console.log(`New balance: ${newBalance} wei (${Number(newBalance) / 1e18} ETH)`);
      console.log(`Spent: ${balance - newBalance} wei`);
    } catch (error: any) {
      console.error('\n❌ TEST FAILED');
      console.error('Error:', error.message);
      console.error('Error details:', error);
      
      console.log('\nAttempting to diagnose EIP-1559 encoding issue:');
      if (signedTx.serialized.length < 10) {
        console.log('❌ Serialized transaction is too short');
      }
      if (signedTx.serialized.substring(2, 4) !== '02') {
        console.log(`❌ Transaction doesn't start with EIP-1559 type identifier (0x02), found: ${signedTx.serialized.substring(2, 4)}`);
      }
      
      // Attempt to help with potential issues
      if (error.message.includes('insufficient funds')) {
        console.log('\nPossible solution: The account may not have enough funds for gas.');
        console.log('Check on Etherscan: https://sepolia.etherscan.io/address/' + TEST_ADDRESS);
      } else if (error.message.includes('replacement transaction underpriced')) {
        console.log('\nPossible solution: The gas price is too low. Try increasing it.');
        console.log('Check current gas prices at: https://owlracle.info/sepolia');
      } else if (error.message.includes('nonce too low')) {
        console.log('\nPossible solution: The nonce is already used. Try incrementing it manually.');
      } else if (error.message.includes('failed to decode')) {
        console.log('\nPossible EIP-1559 encoding issues:');
        console.log('1. Make sure transaction type is 0x02');
        console.log('2. Make sure RLP encoding follows the exact EIP-1559 field order');
        console.log('3. Check for proper byte format of each field');
      }
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

runEIP1559TransactionTest().catch(error => {
  console.error('Unhandled error:', error);
}); 