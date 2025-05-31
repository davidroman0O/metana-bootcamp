import * as dotenv from 'dotenv';

dotenv.config();

import {
  getAddressFromPrivateKey,
  getBalance,
  getNonce,
  getGasPrice,
  estimateGas,
  prepareTransaction,
  signTransaction,
  sendRawTransaction,
} from '../lib/wallet';
import { RawTransaction } from '../types';
import { SEPOLIA_CONFIG } from '../config';
import { bytesToHex } from 'ethereum-cryptography/utils';

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const TEST_ADDRESS = process.env.TEST_ADDRESS || '';

if (!TEST_PRIVATE_KEY || !TEST_ADDRESS) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please make sure TEST_PRIVATE_KEY and TEST_ADDRESS are set in your .env file.');
}

// Small transaction amount: 0.00001 ETH = 10000000000000 wei (10^13)
const SMALL_TRANSACTION_WEI = BigInt(10000000000000);

// Using the .skip to avoid running this test by default as it makes actual network requests
describe.skip('Wallet Transaction Tests with Legacy and EIP-1559 formats', () => {
  // Increase timeout for network operations
  jest.setTimeout(120000); // 120 seconds for both transactions
  
  // Helper function to get gas price with safety multiplier
  async function getAdjustedGasPrice(multiplier = 5.0) {
    const gasPrice = await getGasPrice();
    return BigInt(Math.floor(Number(gasPrice) * multiplier));
  }

  it('should perform complete small transaction flow with legacy format', async () => {
    // Check if environment variables are properly set
    if (!TEST_PRIVATE_KEY || !TEST_ADDRESS) {
      throw new Error('Cannot run test: TEST_PRIVATE_KEY or TEST_ADDRESS environment variable is not set');
    }
    
    try {
      // 1. Verify address derivation
      const derivedAddress = getAddressFromPrivateKey(TEST_PRIVATE_KEY);
      console.log('Derived address:', derivedAddress);
      console.log('Expected address:', TEST_ADDRESS);
      expect(derivedAddress.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
      
      // 2. Get initial balance
      const initialBalance = await getBalance(TEST_ADDRESS);
      console.log(`Initial balance: ${initialBalance} wei (${Number(initialBalance) / 1e18} ETH)`);
      
      // Add a delay to ensure nonce synchronization
      console.log('Waiting for 12 seconds to ensure nonce synchronization...');
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      // 3. Get nonce and gas price
      const nonce = await getNonce(TEST_ADDRESS);
      // Use a higher nonce offset to avoid conflicts
      const nonceToUse = nonce + 15; // Higher offset to avoid conflicts with other tests
      
      const gasPrice = await getAdjustedGasPrice();
      console.log(`Current nonce: ${nonce} (using ${nonceToUse} for transaction)`);
      console.log(`Adjusted gas price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
      
      // 4. Estimate gas with detailed params for debugging
      const estimateParams = {
        from: TEST_ADDRESS,
        to: TEST_ADDRESS, // Self-transfer
        value: '0x' + SMALL_TRANSACTION_WEI.toString(16),
        data: '0x', // No data
      };
      console.log('Gas estimation params:', JSON.stringify(estimateParams, null, 2));
      
      const estimatedGas = await estimateGas(estimateParams);
      console.log(`Estimated gas: ${estimatedGas}`);
      
      // 5. Create transaction object with complete details
      const transaction: RawTransaction = {
        nonce: nonceToUse,
        gasPrice,
        gasLimit: estimatedGas,
        to: TEST_ADDRESS, // Self-transfer
        value: SMALL_TRANSACTION_WEI,
        data: '0x',
        chainId: SEPOLIA_CONFIG.chainId,
        type: 'legacy' // Explicitly set to legacy transaction
      };
      
      console.log('Legacy transaction details:');
      console.log({
        ...transaction,
        // Convert bigints to strings for logging
        gasPrice: transaction.gasPrice?.toString() || 'N/A',
        gasLimit: transaction.gasLimit.toString(),
        value: transaction.value.toString(),
      });
      
      // Calculate total cost
      const gasCost = transaction.gasLimit * (transaction.gasPrice ?? 0n);
      const totalCost = transaction.value + gasCost;
      console.log(`Value: ${transaction.value} wei (${Number(transaction.value) / 1e18} ETH)`);
      console.log(`Gas cost: ${gasCost} wei (${Number(gasCost) / 1e18} ETH)`);
      console.log(`Total cost: ${totalCost} wei (${Number(totalCost) / 1e18} ETH)`);
      
      // Check balance before proceeding
      expect(initialBalance).toBeGreaterThanOrEqual(totalCost);
      console.log('Balance check passed: Have enough funds for legacy transaction');
      
      // 6. Prepare and sign the transaction with detailed debug output
      const preparedTx = prepareTransaction(transaction);
      console.log('Prepared legacy transaction message hash:', bytesToHex(preparedTx.messageHash));
      
      const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
      console.log('Signed legacy transaction details:', {
        v: signedTx.v,
        r: signedTx.r.toString().substring(0, 20) + '...',
        s: signedTx.s.toString().substring(0, 20) + '...',
        type: signedTx.type,
        serialized: signedTx.serialized.substring(0, 50) + '...'
      });
      
      // 7. Send the raw transaction
      const txHash = await sendRawTransaction(signedTx.serialized);
      console.log(`Legacy transaction sent successfully! Hash: ${txHash}`);
      console.log(`Transaction URL: https://sepolia.etherscan.io/tx/${txHash}`);
      
      // 8. Wait a moment and check for new balance
      console.log('Waiting for legacy transaction to be mined...');
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
      
      const finalBalance = await getBalance(TEST_ADDRESS);
      console.log(`Balance after legacy transaction: ${finalBalance} wei (${Number(finalBalance) / 1e18} ETH)`);
      console.log(`Balance difference: ${initialBalance - finalBalance} wei`);
      
      // 9. Transaction should be valid
      expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      
      // Should only spend gas (since it's a self-transfer)
      expect(initialBalance - finalBalance).toBeLessThanOrEqual(gasCost + BigInt(100000)); // Add small buffer
      
      console.log('Legacy transaction test completed successfully');
    } catch (error: any) {
      console.error('Legacy transaction test failed with error:', error);
      console.error('Error message:', error.message);
      // Re-throw to fail the test
      throw error;
    }
  });
  
  it('should perform complete small transaction flow with EIP-1559 format', async () => {
    // Check if environment variables are properly set
    if (!TEST_PRIVATE_KEY || !TEST_ADDRESS) {
      throw new Error('Cannot run test: TEST_PRIVATE_KEY or TEST_ADDRESS environment variable is not set');
    }
    
    try {
      // 1. Verify address derivation
      const derivedAddress = getAddressFromPrivateKey(TEST_PRIVATE_KEY);
      console.log('Derived address:', derivedAddress);
      console.log('Expected address:', TEST_ADDRESS);
      expect(derivedAddress.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
      
      // 2. Get initial balance
      const initialBalance = await getBalance(TEST_ADDRESS);
      console.log(`Initial balance: ${initialBalance} wei (${Number(initialBalance) / 1e18} ETH)`);
      
      // Add a delay to ensure nonce synchronization
      console.log('Waiting for 12 seconds to ensure nonce synchronization...');
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      // 3. Get nonce and gas price
      const nonce = await getNonce(TEST_ADDRESS);
      // Use a different nonce offset than legacy test
      const nonceToUse = nonce + 16; // Use different offset than legacy test (nonce+16)
      
      const rawGasPrice = await getGasPrice();
      
      // For EIP-1559, calculate base fee and priority fee
      const baseFeeEstimate = BigInt(Math.floor(Number(rawGasPrice) * 0.9)); // 90% of gas price as base fee
      const priorityFee = BigInt(Math.floor(Number(rawGasPrice) * 0.1));     // 10% as priority fee
      
      // Use a higher multiplier for maxFeePerGas to ensure transaction acceptance
      const multiplier = 5.0;
      const maxFeePerGas = BigInt(Math.floor(Number(rawGasPrice) * multiplier));
      
      console.log(`Current nonce: ${nonce} (using ${nonceToUse} for transaction)`);
      console.log(`Raw gas price: ${rawGasPrice} wei (${Number(rawGasPrice) / 1e9} Gwei)`);
      console.log(`Estimated base fee: ${baseFeeEstimate} wei (${Number(baseFeeEstimate) / 1e9} Gwei)`);
      console.log(`Priority fee: ${priorityFee} wei (${Number(priorityFee) / 1e9} Gwei)`);
      console.log(`Max fee per gas: ${maxFeePerGas} wei (${Number(maxFeePerGas) / 1e9} Gwei)`);
      
      // 4. Estimate gas
      const estimateParams = {
        from: TEST_ADDRESS,
        to: TEST_ADDRESS, // Self-transfer
        value: '0x' + SMALL_TRANSACTION_WEI.toString(16),
        data: '0x', // No data
      };
      const estimatedGas = await estimateGas(estimateParams);
      console.log(`Estimated gas: ${estimatedGas}`);
      
      // 5. Create EIP-1559 transaction object
      const transaction: RawTransaction = {
        nonce: nonceToUse,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: priorityFee,
        gasLimit: estimatedGas,
        to: TEST_ADDRESS, // Self-transfer
        value: SMALL_TRANSACTION_WEI,
        data: '0x',
        chainId: SEPOLIA_CONFIG.chainId,
        type: 'eip1559' // Explicitly set to EIP-1559 transaction
      };
      
      console.log('EIP-1559 transaction details:');
      console.log({
        ...transaction,
        // Convert bigints to strings for logging
        maxFeePerGas: transaction.maxFeePerGas?.toString() || 'N/A',
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString() || 'N/A',
        gasLimit: transaction.gasLimit.toString(),
        value: transaction.value.toString(),
      });
      
      // Calculate total cost (maximum possible cost)
      const maxGasCost = transaction.gasLimit * (transaction.maxFeePerGas ?? 0n);
      const totalCost = transaction.value + maxGasCost;
      console.log(`Value: ${transaction.value} wei (${Number(transaction.value) / 1e18} ETH)`);
      console.log(`Maximum gas cost: ${maxGasCost} wei (${Number(maxGasCost) / 1e18} ETH)`);
      console.log(`Maximum total cost: ${totalCost} wei (${Number(totalCost) / 1e18} ETH)`);
      
      // Check balance before proceeding
      expect(initialBalance).toBeGreaterThanOrEqual(totalCost);
      console.log('Balance check passed: Have enough funds for EIP-1559 transaction');
      
      // 6. Prepare and sign the transaction with detailed debug output
      const preparedTx = prepareTransaction(transaction);
      console.log('Prepared EIP-1559 transaction message hash:', bytesToHex(preparedTx.messageHash));
      
      const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
      console.log('Signed EIP-1559 transaction details:', {
        v: signedTx.v,
        r: signedTx.r.toString().substring(0, 20) + '...',
        s: signedTx.s.toString().substring(0, 20) + '...',
        type: signedTx.type,
        serialized: signedTx.serialized.substring(0, 50) + '...'
      });
      
      // Verify this is actually an EIP-1559 transaction (should start with 0x02)
      expect(signedTx.serialized.startsWith('0x02')).toBe(true);
      console.log('Verified transaction starts with 0x02 (EIP-1559 identifier)');
      
      // 7. Send the raw transaction
      const txHash = await sendRawTransaction(signedTx.serialized);
      console.log(`EIP-1559 transaction sent successfully! Hash: ${txHash}`);
      console.log(`Transaction URL: https://sepolia.etherscan.io/tx/${txHash}`);
      
      // 8. Wait a moment and check for new balance
      console.log('Waiting for EIP-1559 transaction to be mined...');
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
      
      const finalBalance = await getBalance(TEST_ADDRESS);
      console.log(`Final balance: ${finalBalance} wei (${Number(finalBalance) / 1e18} ETH)`);
      console.log(`Balance difference: ${initialBalance - finalBalance} wei`);
      
      // 9. Transaction should be valid
      expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      
      // Should only spend gas (since it's a self-transfer)
      // Actual gas used will be base fee + priority fee, might be less than maxFeePerGas
      expect(initialBalance - finalBalance).toBeLessThanOrEqual(maxGasCost + BigInt(100000)); // Add buffer
      
      console.log('EIP-1559 transaction test completed successfully');
    } catch (error: any) {
      console.error('EIP-1559 transaction test failed with error:', error);
      console.error('Error message:', error.message);
      // Re-throw to fail the test
      throw error;
    }
  });
}); 