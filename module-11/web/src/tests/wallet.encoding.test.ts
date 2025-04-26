import * as dotenv from 'dotenv';

dotenv.config();

import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, bytesToHex } from 'ethereum-cryptography/utils';
import { RLP } from '@ethereumjs/rlp';
import {
  prepareTransaction,
  signTransaction,
  getAddressFromPrivateKey
} from '../lib/wallet';
import { RawTransaction } from '../types';
import { SEPOLIA_CONFIG } from '../config';

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const TEST_ADDRESS = (process.env.TEST_ADDRESS || (TEST_PRIVATE_KEY ? getAddressFromPrivateKey(TEST_PRIVATE_KEY) : '0x0000000000000000000000000000000000000000'));

if (!TEST_PRIVATE_KEY || !process.env.TEST_ADDRESS) {
  console.warn('Warning: TEST_PRIVATE_KEY or TEST_ADDRESS not found in environment variables.');
  console.warn('Tests will use fallbacks, but it is recommended to set these in your .env file.');
}

describe('Transaction Encoding and Signing', () => {
  // This test validates the RLP encoding of transaction data
  it('should correctly encode transaction data with RLP', () => {
    // Create a transaction with fixed values for reproducible tests
    const transaction: RawTransaction = {
      nonce: 42,
      gasPrice: BigInt(20000000000), // 20 Gwei
      gasLimit: BigInt(21000),
      to: TEST_ADDRESS,
      value: BigInt(10000000000000), // 0.00001 ETH
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
    };
    
    // Manually encode in the test to verify our implementation
    const manuallyEncodedData = [
      transaction.nonce === 0 ? new Uint8Array([]) : transaction.nonce,
      transaction.gasPrice === 0n ? new Uint8Array([]) : transaction.gasPrice,
      transaction.gasLimit === 0n ? new Uint8Array([]) : transaction.gasLimit,
      hexToBytes(transaction.to.slice(2)), // Remove 0x
      transaction.value === 0n ? new Uint8Array([]) : transaction.value,
      hexToBytes(transaction.data.slice(2)), // Remove 0x
      transaction.chainId,
      new Uint8Array([]), // v (empty for unsigned)
      new Uint8Array([]), // r (empty for unsigned)
      new Uint8Array([]), // s (empty for unsigned)
    ];
    
    const manuallyEncodedTx = RLP.encode(manuallyEncodedData);
    const manuallyComputedHash = keccak256(manuallyEncodedTx);
    
    // Now compare with our function's output
    const preparedTx = prepareTransaction(transaction);
    
    // Add debugging
    console.log('Manually encoded hash:', bytesToHex(manuallyComputedHash));
    console.log('Function encoded hash:', bytesToHex(preparedTx.messageHash));

    // The hashes should match
    expect(bytesToHex(preparedTx.messageHash)).toBe(bytesToHex(manuallyComputedHash));
  });
  
  // This test ensures the signature components are correctly formatted
  it('should generate valid v, r, s signature components', () => {
    // Skip test if we don't have a private key
    if (!TEST_PRIVATE_KEY) {
      console.warn('Skipping signature test because TEST_PRIVATE_KEY is not set');
      return;
    }
    
    // Create a transaction with fixed values
    const transaction: RawTransaction = {
      nonce: 42,
      gasPrice: BigInt(20000000000), // 20 Gwei
      gasLimit: BigInt(21000),
      to: TEST_ADDRESS, 
      value: BigInt(10000000000000), // 0.00001 ETH
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
    };
    
    const preparedTx = prepareTransaction(transaction);
    const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    // Check v value - should be recovery ID + chainId * 2 + 35
    // For Sepolia with chainId 11155111, v should be quite large
    const expectedVRange = [11155111 * 2 + 35, 11155111 * 2 + 36]; // Either recovery 0 or 1
    expect(signedTx.v).toBeGreaterThanOrEqual(expectedVRange[0]);
    expect(signedTx.v).toBeLessThanOrEqual(expectedVRange[1]);
    
    // r and s should be bigints
    expect(typeof signedTx.r).toBe('bigint');
    expect(typeof signedTx.s).toBe('bigint');
    
    // r and s should be valid ECDSA signature components (non-zero)
    expect(signedTx.r).toBeGreaterThan(0n);
    expect(signedTx.s).toBeGreaterThan(0n);
    
    // r and s should be less than the secp256k1 curve order
    const SECP256K1_ORDER = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    expect(signedTx.r).toBeLessThan(SECP256K1_ORDER);
    expect(signedTx.s).toBeLessThan(SECP256K1_ORDER);
  });
  
  // This test checks that the final serialized transaction can be properly decoded
  it('should produce correctly serialized transactions that can be decoded', () => {
    // Skip test if we don't have a private key
    if (!TEST_PRIVATE_KEY) {
      console.warn('Skipping serialization test because TEST_PRIVATE_KEY is not set');
      return;
    }
    
    // Create a transaction with fixed values
    const transaction: RawTransaction = {
      nonce: 42,
      gasPrice: BigInt(20000000000), // 20 Gwei
      gasLimit: BigInt(21000),
      to: TEST_ADDRESS,
      value: BigInt(10000000000000), // 0.00001 ETH
      data: '0x',
      chainId: SEPOLIA_CONFIG.chainId,
    };
    
    const preparedTx = prepareTransaction(transaction);
    const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
    
    // The serialized transaction should be a valid hex string starting with 0x
    expect(signedTx.serialized).toMatch(/^0x[0-9a-fA-F]+$/);
    
    // We should be able to decode it
    const serializedBytes = hexToBytes(signedTx.serialized.slice(2)); // Remove 0x
    const decodedTx = RLP.decode(serializedBytes) as any[];
    
    // Should have 9 items (original 6 tx fields + v, r, s)
    expect(decodedTx.length).toBe(9);
    
    // Decode the RLP items and verify against original values
    // Note: RLP decodes numbers to Uint8Array, so we need to convert
    
    // Check nonce (first field)
    const decodedNonce = decodedTx[0] instanceof Uint8Array && decodedTx[0].length > 0 
      ? parseInt(bytesToHex(decodedTx[0] as Uint8Array), 16) 
      : 0;
    expect(decodedNonce).toBe(transaction.nonce);
    
    // Check value (fifth field)
    const decodedValue = decodedTx[4] instanceof Uint8Array && decodedTx[4].length > 0 
      ? BigInt(`0x${bytesToHex(decodedTx[4] as Uint8Array)}`) 
      : 0n;
    expect(decodedValue).toBe(transaction.value);
    
    // Check to address (fourth field) - with 0x prefix
    const decodedTo = `0x${bytesToHex(decodedTx[3] as Uint8Array)}`;
    expect(decodedTo.toLowerCase()).toBe(transaction.to.toLowerCase());
  });
}); 