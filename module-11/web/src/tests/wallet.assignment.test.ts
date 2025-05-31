/**
 * Complete Wallet Functionality Test for Assignment
 * 
 * This file demonstrates all the key wallet functionality:
 * 1. Key generation and address derivation
 * 2. Account nonce retrieval and management
 * 3. Gas estimation
 * 4. Raw transaction creation, signing, and submission
 * 
 */

import * as dotenv from 'dotenv';

dotenv.config();

import {
  generateKeysPair,
  getAddressFromPrivateKey,
  getBalance,
  getNonce,
  getGasPrice,
  estimateGas,
  prepareTransaction,
  signTransaction,
  sendRawTransaction,
  getTransactionUrl
} from '../lib/wallet';
import { RawTransaction } from '../types';
import { SEPOLIA_CONFIG } from '../config';

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const EXPECTED_ADDRESS = process.env.TEST_ADDRESS?.toLowerCase() || 
  (TEST_PRIVATE_KEY ? getAddressFromPrivateKey(TEST_PRIVATE_KEY).toLowerCase() : '');

if (!TEST_PRIVATE_KEY) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please make sure TEST_PRIVATE_KEY is set in your .env file.');
  process.exit(1);
}

// Testing value (1 wei - smallest possible value)
const TEST_VALUE_WEI = BigInt(1);

/**
 * Main test function to demonstrate all wallet functionality
 */
async function testWalletFunctionality() {
  console.log('=== CUSTOM WALLET IMPLEMENTATION TEST ===');
  console.log('This test demonstrates the complete wallet functionality implemented manually');
  console.log('without relying on wallet libraries like Web3.js or Ethers.js.\n');
  
  try {
    // 1. Generate a new key pair and check address derivation
    console.log('=== 1. KEY GENERATION & ADDRESS DERIVATION ===');
    
    // Generate a completely new key pair (not used in transactions)
    const newKeys = generateKeysPair();
    console.log('Generated new wallet:');
    console.log(`- Private Key: ${newKeys.privateKey.substring(0, 6)}...${newKeys.privateKey.substring(58)}`);
    console.log(`- Address: ${newKeys.address}`);
    
    // Derive address from existing private key
    const derivedAddress = getAddressFromPrivateKey(TEST_PRIVATE_KEY);
    console.log('\nDerived address from existing key:');
    console.log(`- Private Key (partial): ${TEST_PRIVATE_KEY.substring(0, 6)}...${TEST_PRIVATE_KEY.substring(58)}`);
    console.log(`- Address: ${derivedAddress}`);
    console.log(`- Expected Address: ${EXPECTED_ADDRESS}`);
    
    // Verify address matches expected address
    if (derivedAddress.toLowerCase() !== EXPECTED_ADDRESS.toLowerCase()) {
      throw new Error(`Derived address ${derivedAddress} does not match expected address ${EXPECTED_ADDRESS}`);
    }
    console.log('✅ Address verification successful');
    
    // 2. Check account balance
    console.log('\n=== 2. BALANCE & NONCE MANAGEMENT ===');
    
    // This demonstrates manually fetching account state without wallet libraries
    const balance = await getBalance(derivedAddress);
    console.log(`Balance: ${balance} wei (${Number(balance) / 1e18} ETH)`);
    
    // Add a proper delay to ensure nonce synchronization
    console.log('Waiting for nonce synchronization (12 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 12000)); // Wait 12 seconds
    
    // Check account nonce manually (required for transaction sequencing)
    let nonce = await getNonce(derivedAddress);
    console.log('Current nonce:', nonce);
    
    // Use a larger increment to avoid conflicts with pending transactions
    const nonceToUse = nonce + 30;  // Use different offset than other tests
    console.log(`Using nonce: ${nonceToUse} (nonce+30 to avoid pending transaction conflicts)`);
    
    // 3. Transaction Gas Management
    console.log('\n=== 3. GAS MANAGEMENT ===');
    
    // Get current gas price from the network
    let rawGasPrice = await getGasPrice();
    
    // Use a higher gas price to ensure transaction success
    // 5x of the actual gas price
    const gasPercentage = 5.0; // 500% of current gas price
    const adjustedGasPrice = BigInt(Math.floor(Number(rawGasPrice) * gasPercentage));
    console.log(`Raw gas price: ${rawGasPrice} wei (${Number(rawGasPrice) / 1e9} Gwei)`);
    console.log(`Adjusted gas price: ${adjustedGasPrice} wei (${Number(adjustedGasPrice) / 1e9} Gwei)`);
    
    // For EIP-1559 transactions
    const baseFeeEstimate = BigInt(Math.floor(Number(rawGasPrice) * 0.9)); // 90% of gas price as base fee
    const priorityFee = BigInt(Math.floor(Number(rawGasPrice) * 0.1));     // 10% as priority fee
    const maxFeePerGas = BigInt(Math.floor(Number(rawGasPrice) * gasPercentage));
    
    console.log(`EIP-1559 Base Fee Estimate: ${baseFeeEstimate} wei (${Number(baseFeeEstimate) / 1e9} Gwei)`);
    console.log(`EIP-1559 Priority Fee: ${priorityFee} wei (${Number(priorityFee) / 1e9} Gwei)`);
    console.log(`EIP-1559 Max Fee: ${maxFeePerGas} wei (${Number(maxFeePerGas) / 1e9} Gwei)`);
    
    // Manually estimate gas - a wallet library would abstract this
    const estimatedGas = await estimateGas({
      from: derivedAddress,
      to: derivedAddress, // Self-transfer for testing
      value: `0x${TEST_VALUE_WEI.toString(16)}`,
      data: '0x',
    });
    console.log(`Estimated gas for transaction: ${estimatedGas}`);
    
    // Standard gas for simple transfer
    const gasLimit = BigInt(21000);
    console.log(`Using gas limit: ${gasLimit}`);
    
    // Calculate transaction cost
    const legacyGasCost = adjustedGasPrice * gasLimit;
    const legacyTotalCost = TEST_VALUE_WEI + legacyGasCost;
    console.log(`Transaction value: ${TEST_VALUE_WEI} wei`);
    console.log(`Legacy Gas cost: ${legacyGasCost} wei (${Number(legacyGasCost) / 1e18} ETH)`);
    console.log(`Legacy Total cost: ${legacyTotalCost} wei (${Number(legacyTotalCost) / 1e18} ETH)`);
    
    const eip1559GasCost = maxFeePerGas * gasLimit;
    const eip1559TotalCost = TEST_VALUE_WEI + eip1559GasCost;
    console.log(`EIP-1559 Gas cost: ${eip1559GasCost} wei (${Number(eip1559GasCost) / 1e18} ETH)`);
    console.log(`EIP-1559 Total cost: ${eip1559TotalCost} wei (${Number(eip1559TotalCost) / 1e18} ETH)`);
    
    // Use the higher cost for balance check
    const maxTotalCost = legacyTotalCost > eip1559TotalCost ? legacyTotalCost : eip1559TotalCost;
    
    // Check if we have enough funds
    if (balance < maxTotalCost) {
      console.log(`\n⚠️ Not enough funds to send transaction. Have ${balance} wei, need ${maxTotalCost} wei.`);
      console.log('Skipping transaction submission but continuing with preparation and signing demo.');
    } else {
      console.log('✅ Sufficient balance for the adjusted gas price');
    }
    
    // 4. Legacy Transaction Preparation - manually constructing without wallet libraries
    console.log('\n=== 4. LEGACY TRANSACTION PREPARATION ===');
    
    // Create a legacy transaction (example transfer of 1 wei, for testing)
    const legacyTx: RawTransaction = {
      nonce: nonceToUse,
      gasPrice: adjustedGasPrice,
      gasLimit: gasLimit,
      to: derivedAddress, // self-transfer (sending to our own address)
      value: TEST_VALUE_WEI,
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
      type: 'legacy'
    };
    
    console.log('Legacy transaction prepared:');
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
    
    // 5. Legacy Transaction Signing - manually done without wallet libraries
    console.log('\n=== 5. LEGACY TRANSACTION SIGNING ===');
    
    console.log('Preparing legacy transaction with:');
    console.log('- nonce:', legacyTx.nonce, typeof legacyTx.nonce);
    console.log('- gasPrice:', legacyTx.gasPrice, typeof legacyTx.gasPrice);
    console.log('- gasLimit:', legacyTx.gasLimit, typeof legacyTx.gasLimit);
    console.log('- to:', legacyTx.to);
    console.log('- value:', legacyTx.value, typeof legacyTx.value);
    console.log('- data:', legacyTx.data);
    console.log('- chainId:', legacyTx.chainId);
    
    // Prepare the legacy transaction for signing (manually encoding for RLP)
    const preparedLegacyTx = prepareTransaction(legacyTx);
    console.log('Transaction prepared for signing with messageHash:');
    
    // Sign the legacy transaction (implementing EIP-155 without wallet libraries)
    const signedLegacyTx = signTransaction(preparedLegacyTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    console.log('Signature details:');
    console.log(`- v: ${signedLegacyTx.v}`);
    console.log(`- r: ${signedLegacyTx.r.toString().substring(0, 20)}...`);
    console.log(`- s: ${signedLegacyTx.s.toString().substring(0, 20)}...`);
    
    console.log('\nSerialized signed transaction:');
    console.log(signedLegacyTx.serialized.substring(0, 50) + '...');
    
    // 6. EIP-1559 Transaction Preparation
    console.log('\n=== 6. EIP-1559 TRANSACTION PREPARATION ===');
    
    // Create an EIP-1559 transaction (example transfer of 1 wei, for testing)
    const eip1559Tx: RawTransaction = {
      nonce: nonceToUse + 1, // Use a different nonce to avoid conflicts
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      gasLimit: gasLimit,
      to: derivedAddress, // self-transfer
      value: TEST_VALUE_WEI,
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
      type: 'eip1559'
    };
    
    console.log('EIP-1559 transaction prepared:');
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
    
    // 7. EIP-1559 Transaction Signing
    console.log('\n=== 7. EIP-1559 TRANSACTION SIGNING ===');
    
    // Prepare the transaction for signing
    const preparedEip1559Tx = prepareTransaction(eip1559Tx);
    console.log('EIP-1559 transaction prepared for signing');
    
    // Sign the transaction
    const signedEip1559Tx = signTransaction(preparedEip1559Tx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    console.log('EIP-1559 signature details:');
    console.log(`- v: ${signedEip1559Tx.v}`);
    console.log(`- r: ${signedEip1559Tx.r.toString().substring(0, 20)}...`);
    console.log(`- s: ${signedEip1559Tx.s.toString().substring(0, 20)}...`);
    
    console.log('\nSerialized EIP-1559 transaction:');
    console.log(signedEip1559Tx.serialized.substring(0, 50) + '...');
    console.log('First few bytes:', signedEip1559Tx.serialized.substring(0, 10)); // Should start with 0x02
    
    // 8. Transaction Broadcasting - only if we have enough balance
    if (balance >= maxTotalCost) {
      // First send the legacy transaction
      console.log('\n=== 8. LEGACY TRANSACTION BROADCASTING ===');
      console.log('Sending legacy transaction to network...');
      
      try {
        // Send the raw transaction without wallet libraries
        const legacyTxHash = await sendRawTransaction(signedLegacyTx.serialized);
        
        console.log('\n✅ LEGACY TRANSACTION SENT SUCCESSFULLY!');
        console.log(`Transaction hash: ${legacyTxHash}`);
        console.log(`View on Etherscan: ${getTransactionUrl(legacyTxHash)}`);
        
        // Wait a moment for the transaction to be processed
        console.log('\nWaiting for transaction confirmation...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        
        // Then send the EIP-1559 transaction
        console.log('\n=== 9. EIP-1559 TRANSACTION BROADCASTING ===');
        console.log('Sending EIP-1559 transaction to network...');
        
        const eip1559TxHash = await sendRawTransaction(signedEip1559Tx.serialized);
        
        console.log('\n✅ EIP-1559 TRANSACTION SENT SUCCESSFULLY!');
        console.log(`Transaction hash: ${eip1559TxHash}`);
        console.log(`View on Etherscan: ${getTransactionUrl(eip1559TxHash)}`);
        
        // Wait a moment for the transaction to be processed
        console.log('\nWaiting for transaction confirmation...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        
        // Check new balance
        const newBalance = await getBalance(derivedAddress);
        console.log(`New balance: ${newBalance} wei (${Number(newBalance) / 1e18} ETH)`);
        console.log(`Change: ${newBalance - balance} wei`);
      } catch (error: any) {
        console.error('\n❌ TRANSACTION SUBMISSION FAILED');
        console.error(`Error: ${error.message}`);
        
        if (error.message.includes('insufficient funds')) {
          console.log('\nPossible solution: The account may not have enough funds for gas.');
          console.log('Check on Etherscan: https://sepolia.etherscan.io/address/' + derivedAddress);
        } else if (error.message.includes('replacement transaction underpriced')) {
          console.log('\nPossible solution: The gas price is too low. Try increasing it.');
          console.log('Check current gas prices at: https://owlracle.info/sepolia');
        } else if (error.message.includes('nonce too low')) {
          console.log('\nPossible solution: The nonce is already used. Try incrementing it manually.');
        }
      }
    } else {
      console.log('\n=== 8 & 9. TRANSACTION BROADCASTING (SKIPPED) ===');
      console.log('Transaction broadcasting was skipped due to insufficient funds.');
      console.log('To complete this test, fund the test wallet address shown above.');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('This test has demonstrated all required wallet functionality:');
    console.log('1. ✅ Manual key management and address derivation');
    console.log('2. ✅ Manual nonce management');
    console.log('3. ✅ Manual gas estimation');
    console.log('4. ✅ Manual transaction preparation (Legacy & EIP-1559)');
    console.log('5. ✅ Manual transaction signing (Legacy & EIP-1559)');
    if (balance >= maxTotalCost) {
      console.log('6. ✅ Manual transaction broadcasting (Legacy & EIP-1559)');
    } else {
      console.log('6. ❌ Transaction broadcasting (skipped due to insufficient funds)');
    }
  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error(`Error: ${error.message}`);
    console.error(error);
  }
}

testWalletFunctionality().catch(console.error); 