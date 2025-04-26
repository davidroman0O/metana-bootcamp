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
describe.skip('Small Transaction Test (0.00001 ETH)', () => {
  // Increase timeout for network operations
  jest.setTimeout(60000); // 60 seconds
  
  it('should perform complete small transaction flow with debug output', async () => {
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
      
      // 3. Get nonce and gas price
      const nonce = await getNonce(TEST_ADDRESS);
      const gasPrice = await getGasPrice();
      console.log(`Current nonce: ${nonce}`);
      console.log(`Current gas price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
      
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
        nonce,
        gasPrice,
        gasLimit: estimatedGas,
        to: TEST_ADDRESS, // Self-transfer
        value: SMALL_TRANSACTION_WEI,
        data: '0x',
        chainId: SEPOLIA_CONFIG.chainId,
      };
      
      console.log('Raw transaction details:', {
        ...transaction,
        // Convert bigints to strings for logging
        gasPrice: transaction.gasPrice.toString(),
        gasLimit: transaction.gasLimit.toString(),
        value: transaction.value.toString(),
      });
      
      // Calculate total cost
      const gasCost = transaction.gasLimit * transaction.gasPrice;
      const totalCost = transaction.value + gasCost;
      console.log(`Value: ${transaction.value} wei (${Number(transaction.value) / 1e18} ETH)`);
      console.log(`Gas cost: ${gasCost} wei (${Number(gasCost) / 1e18} ETH)`);
      console.log(`Total cost: ${totalCost} wei (${Number(totalCost) / 1e18} ETH)`);
      
      // Check balance before proceeding
      expect(initialBalance).toBeGreaterThanOrEqual(totalCost);
      console.log('Balance check passed: Have enough funds for transaction');
      
      // 6. Prepare and sign the transaction with detailed debug output
      const preparedTx = prepareTransaction(transaction);
      console.log('Prepared transaction message hash:', bytesToHex(preparedTx.messageHash));
      
      const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
      console.log('Signed transaction details:', {
        v: signedTx.v,
        r: signedTx.r.toString(),
        s: signedTx.s.toString(),
        serialized: signedTx.serialized
      });
      
      // 7. Send the raw transaction
      const txHash = await sendRawTransaction(signedTx.serialized);
      console.log(`Transaction sent successfully! Hash: ${txHash}`);
      console.log(`Transaction URL: https://sepolia.etherscan.io/tx/${txHash}`);
      
      // 8. Wait a moment and check for new balance
      console.log('Waiting for transaction to be mined...');
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
      
      const finalBalance = await getBalance(TEST_ADDRESS);
      console.log(`Final balance: ${finalBalance} wei (${Number(finalBalance) / 1e18} ETH)`);
      console.log(`Balance difference: ${initialBalance - finalBalance} wei`);
      
      // 9. Transaction should be valid
      expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      
      // Should only spend gas (since it's a self-transfer)
      expect(initialBalance - finalBalance).toBeLessThanOrEqual(gasCost + BigInt(100000)); // Add small buffer
      
      console.log('Test completed successfully');
    } catch (error: any) {
      console.error('Test failed with error:', error);
      console.error('Error message:', error.message);
      // Re-throw to fail the test
      throw error;
    }
  });
}); 