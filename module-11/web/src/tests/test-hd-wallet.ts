// TypeScript test for HD wallet implementation
// Run with: npx tsx src/tests/test-hd-wallet.ts

import * as dotenv from 'dotenv';
dotenv.config();

import {
  generateHDWallet,
  importHDWallet,
  deriveAddressFromHDWallet,
  getAddressFromPrivateKey,
  DEFAULT_HD_PATH
} from '../lib/wallet';

import { generateMnemonic, validateMnemonic } from 'ethereum-cryptography/bip39';
import { wordlist } from 'ethereum-cryptography/bip39/wordlists/english';

// Test mnemonic (DO NOT USE IN PRODUCTION!)
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Main function to test HD wallet features
async function testHDWallet() {
  console.log('\n=== HD WALLET FUNCTIONALITY TEST ===');
  
  try {
    // Test 1: Generate a new HD wallet with 12 words (128-bit entropy)
    console.log('\n=== 1. GENERATE NEW HD WALLET (12 words) ===');
    const wallet12 = generateHDWallet(128, DEFAULT_HD_PATH);
    console.log(`Generated 12-word mnemonic: ${wallet12.hdWallet?.mnemonic}`);
    console.log(`Derived address: ${wallet12.address}`);
    console.log(`Private key: ${wallet12.privateKey.substring(0, 6)}...${wallet12.privateKey.substring(58)}`);
    console.log(`Derivation path: ${wallet12.hdWallet?.hdPath}`);
    
    // Verify the mnemonic has 12 words
    const wordCount12 = wallet12.hdWallet?.mnemonic.split(' ').length || 0;
    console.log(`Word count: ${wordCount12}`);
    if (wordCount12 !== 12) {
      throw new Error('Expected 12 words in mnemonic');
    }
    
    // Test 2: Generate a new HD wallet with 24 words (256-bit entropy)
    console.log('\n=== 2. GENERATE NEW HD WALLET (24 words) ===');
    const wallet24 = generateHDWallet(256, DEFAULT_HD_PATH);
    console.log(`Generated 24-word mnemonic: ${wallet24.hdWallet?.mnemonic}`);
    console.log(`Derived address: ${wallet24.address}`);
    console.log(`Private key: ${wallet24.privateKey.substring(0, 6)}...${wallet24.privateKey.substring(58)}`);
    console.log(`Derivation path: ${wallet24.hdWallet?.hdPath}`);
    
    // Verify the mnemonic has 24 words
    const wordCount24 = wallet24.hdWallet?.mnemonic.split(' ').length || 0;
    console.log(`Word count: ${wordCount24}`);
    if (wordCount24 !== 24) {
      throw new Error('Expected 24 words in mnemonic');
    }
    
    // Test 3: Import an existing mnemonic
    console.log('\n=== 3. IMPORT MNEMONIC ===');
    // Validate our test mnemonic is valid
    if (!validateMnemonic(TEST_MNEMONIC, wordlist)) {
      throw new Error('Test mnemonic is invalid');
    }
    
    const importedWallet = importHDWallet(TEST_MNEMONIC, DEFAULT_HD_PATH);
    console.log(`Imported mnemonic: ${importedWallet.hdWallet?.mnemonic}`);
    console.log(`Derived address: ${importedWallet.address}`);
    console.log(`Private key: ${importedWallet.privateKey.substring(0, 6)}...${importedWallet.privateKey.substring(58)}`);
    console.log(`Derivation path: ${importedWallet.hdWallet?.hdPath}`);
    
    // Test 4: Derive multiple addresses from the same HD wallet
    console.log('\n=== 4. DERIVE MULTIPLE ADDRESSES FROM SAME HD WALLET ===');
    
    if (!importedWallet.hdWallet) {
      throw new Error('HD wallet info missing from imported wallet');
    }
    
    // Derive first 5 addresses (index 0-4)
    for (let i = 0; i < 5; i++) {
      const derived = deriveAddressFromHDWallet(importedWallet.hdWallet, i);
      console.log(`Address at index ${i}: ${derived.address}`);
      console.log(`Private key at index ${i}: ${derived.privateKey.substring(0, 6)}...${derived.privateKey.substring(58)}`);
      console.log(`Path: ${derived.hdWallet?.hdPath}`);
      console.log('---');
    }
    
    // Verify consistency - when we import the same mnemonic with the same path, we should get the same address
    console.log('\n=== 5. VERIFY CONSISTENCY ===');
    const reimportedWallet = importHDWallet(TEST_MNEMONIC, DEFAULT_HD_PATH);
    console.log(`Original address: ${importedWallet.address}`);
    console.log(`Reimported address: ${reimportedWallet.address}`);
    
    if (importedWallet.address !== reimportedWallet.address) {
      throw new Error('Reimported wallet address does not match original');
    }
    console.log('✅ Addresses match - consistency verified');
    
    // Overall status
    console.log('\n=== TEST COMPLETE ===');
    console.log('✅ HD wallet functionality tests passed');
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error(error);
  }
}

// Run test
testHDWallet().catch(console.error); 