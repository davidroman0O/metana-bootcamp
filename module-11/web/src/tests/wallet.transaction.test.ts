// npm test -- -t "Wallet Transaction E2E"
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
  getTransactionUrl
} from '../lib/wallet';
import { RawTransaction } from '../types';
import { SEPOLIA_CONFIG } from '../config';

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const TEST_ADDRESS = process.env.TEST_ADDRESS || '';

const areCredentialsValid = TEST_PRIVATE_KEY && TEST_ADDRESS;
const skipNetworkTests = !areCredentialsValid;

describe.skip('Wallet Transaction E2E', () => {
  // This is a long-running test that makes real network calls
  jest.setTimeout(30000); // 30 seconds timeout
  
  beforeEach(() => {
    // Skip test if credentials aren't set
    if (!areCredentialsValid) {
      console.warn('Skipping test because environment variables are not set');
      console.warn('Please set TEST_PRIVATE_KEY and TEST_ADDRESS in your .env file to run this test');
    }
  });
  
  it('should correctly send a small transaction to self', async () => {
    // Skip the test if we don't have valid credentials
    if (!areCredentialsValid) {
      return;
    }
    
    // Verify the private key derives to the expected address
    const derivedAddress = getAddressFromPrivateKey(TEST_PRIVATE_KEY);
    expect(derivedAddress.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
    
    // Get current balance before transaction
    const initialBalance = await getBalance(TEST_ADDRESS);
    console.log(`Initial balance: ${initialBalance} wei`);
    
    // Prepare transaction parameters
    const nonce = await getNonce(TEST_ADDRESS);
    const gasPrice = await getGasPrice();
    
    // Set a very small value: 0.00001 ETH = 10000000000000 wei (10^13)
    const valueWei = BigInt(10000000000000);
    
    // Estimate gas for sending to self
    const estimatedGas = await estimateGas({
      from: TEST_ADDRESS,
      to: TEST_ADDRESS,
      value: '0x' + valueWei.toString(16),
      data: '0x', // No data
    });
    
    console.log(`Estimated gas: ${estimatedGas}`);
    
    // Create transaction object
    const transaction: RawTransaction = {
      nonce,
      gasPrice,
      gasLimit: estimatedGas,
      to: TEST_ADDRESS, // Sending to self
      value: valueWei,
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
    };
    
    // Calculate total cost (value + gas)
    const gasCost = transaction.gasLimit * transaction.gasPrice;
    const totalCost = transaction.value + gasCost;
    
    console.log(`Transaction value: ${transaction.value} wei`);
    console.log(`Gas cost: ${gasCost} wei`);
    console.log(`Total cost: ${totalCost} wei`);
    
    // Ensure we have enough balance
    expect(initialBalance).toBeGreaterThanOrEqual(totalCost);
    
    // Prepare and sign the transaction
    const preparedTx = prepareTransaction(transaction);
    const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    console.log(`Signed transaction: ${signedTx.serialized}`);
    
    // Send the transaction
    const txHash = await sendRawTransaction(signedTx.serialized);
    console.log(`Transaction hash: ${txHash}`);
    console.log(`Transaction URL: ${getTransactionUrl(txHash)}`);
    
    // Wait for transaction to be mined (in a real test, you'd want to poll for confirmation)
    // For this test, we'll just verify we got a transaction hash back
    expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });
});

// Mock tests that don't make actual network calls
describe('Wallet Transaction Unit Tests', () => {
  beforeEach(() => {
    // Warn if environment variables are missing
    if (!areCredentialsValid) {
      console.warn('Warning: TEST_PRIVATE_KEY or TEST_ADDRESS not set in environment.');
      console.warn('Using mock values for tests, but real transactions will not be possible.');
    }
  });
  
  it('should correctly prepare a transaction for self-transfer', () => {
    // Use either the real address or a mock address for unit tests
    const address = TEST_ADDRESS || '0x1234567890123456789012345678901234567890';
    
    // Prepare a test transaction
    const transaction: RawTransaction = {
      nonce: 1,
      gasPrice: BigInt(20000000000), // 20 Gwei
      gasLimit: BigInt(21000), // Standard ETH transfer
      to: address,
      value: BigInt(10000000000000), // 0.00001 ETH
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
    };
    
    const preparedTx = prepareTransaction(transaction);
    
    // Verify the prepared transaction has the expected fields
    expect(preparedTx.messageHash).toBeDefined();
    expect(preparedTx.encodedTx).toBeDefined();
    expect(preparedTx.txData).toBeDefined();
    expect(preparedTx.txData.length).toBe(6); // The 6 core transaction fields
  });
  
  it('should correctly sign a prepared transaction', () => {
    // Skip test if we don't have a private key
    if (!TEST_PRIVATE_KEY) {
      console.warn('Skipping signature test because TEST_PRIVATE_KEY is not set');
      return;
    }
    
    // Use either the real address or a mock address for unit tests
    const address = TEST_ADDRESS || '0x1234567890123456789012345678901234567890';
    
    // Prepare a test transaction
    const transaction: RawTransaction = {
      nonce: 1,
      gasPrice: BigInt(20000000000), // 20 Gwei
      gasLimit: BigInt(21000), // Standard ETH transfer
      to: address,
      value: BigInt(10000000000000), // 0.00001 ETH
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
    };
    
    const preparedTx = prepareTransaction(transaction);
    const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    // Verify the signed transaction has the expected fields
    expect(signedTx.v).toBeDefined();
    expect(signedTx.r).toBeDefined();
    expect(signedTx.s).toBeDefined();
    expect(signedTx.serialized).toMatch(/^0x[0-9a-fA-F]+$/);
  });
}); 