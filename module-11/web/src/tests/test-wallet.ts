// TypeScript test for the wallet implementation
// Run with: npx tsx src/tests/test-wallet.ts

import * as dotenv from 'dotenv';

dotenv.config();

import {
  getAddressFromPrivateKey,
  getBalance,
} from '../lib/wallet';
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils';
import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { keccak256 } from 'ethereum-cryptography/keccak';

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

runWalletTest().catch(console.error); 