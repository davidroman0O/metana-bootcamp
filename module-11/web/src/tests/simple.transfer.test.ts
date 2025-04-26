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
    
    console.log('\n=== TRANSACTION PREPARATION ===');
    const nonce = await getNonce(derivedAddress);
    const rawGasPrice = await getGasPrice();
    
    // Using a much lower gas price to fit within our balance
    // According to https://owlracle.info/sepolia, gas prices are high on my Saturday morning of programming... AAAAH
    // Multiply by 0.1 to reduce gas price by 90%
    const gasPrice = BigInt(Math.floor(Number(rawGasPrice) * 0.1));
    
    console.log(`Nonce: ${nonce}`);
    console.log(`Raw Gas Price: ${rawGasPrice} wei (${Number(rawGasPrice) / 1e9} Gwei)`);
    console.log(`Adjusted Gas Price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
    
    // Create a minimal transaction (self-transfer of 1 wei)
    const tx: RawTransaction = {
      nonce, // Same format as Web3.js uses
      gasPrice, // Use the adjusted gas price
      gasLimit: BigInt(21000), // Standard ETH transfer gas limit
      to: derivedAddress, // Self-transfer
      value: TRANSACTION_WEI,
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId
    };
    
    // Calculate gas cost
    const gasCost = tx.gasPrice * tx.gasLimit;
    console.log(`Gas cost: ${gasCost} wei (${Number(gasCost) / 1e18} ETH)`);
    console.log(`Total cost: ${gasCost + tx.value} wei`);
    
    // Check if we have enough balance for the transaction
    if (balance < (gasCost + tx.value)) {
      console.error(`❌ Insufficient balance. Have ${balance} wei, need ${gasCost + tx.value} wei.`);
      return;
    }
    console.log('✅ Sufficient balance for the adjusted gas price');
    
    console.log('\n=== TRANSACTION SIGNING ===');
    const preparedTx = prepareTransaction(tx);
    const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    console.log('Signed transaction details:');
    console.log('- v:', signedTx.v);
    console.log('- r:', signedTx.r.toString());
    console.log('- s:', signedTx.s.toString());
    console.log('- serialized:', signedTx.serialized);
    
    console.log('\n=== SENDING TRANSACTION ===');
    console.log('Sending transaction...');
    
    // Print complete transaction details for debugging
    console.log('Transaction Details:');
    console.log(JSON.stringify({
      nonce: tx.nonce,
      gasPrice: tx.gasPrice.toString(),
      gasLimit: tx.gasLimit.toString(),
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data,
      chainId: tx.chainId
    }, null, 2));
    
    const txHash = await sendRawTransaction(signedTx.serialized);
    
    console.log('\n✅ TRANSACTION SENT SUCCESSFULLY!');
    console.log(`Transaction hash: ${txHash}`);
    console.log(`View on Etherscan: ${SEPOLIA_CONFIG.blockExplorer}/tx/${txHash}`);
    
    console.log('\nWaiting for transaction to be mined...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const newBalance = await getBalance(derivedAddress);
    console.log(`New balance: ${newBalance} wei (${Number(newBalance) / 1e18} ETH)`);
    console.log(`Spent: ${balance - newBalance} wei`);
    
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
      console.log('Check current gas prices at: https://owlracle.info/sepolia ngl very useful website');
    } else if (error.message.includes('nonce too low')) {
      console.log('\nPossible solution: The nonce is already used. Try incrementing it manually.');
    }
  }
}

runTransactionTest().catch(error => {
  console.error('Unhandled error:', error);
}); 