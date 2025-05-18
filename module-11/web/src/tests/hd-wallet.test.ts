// Test file for HD wallet functionality
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'ethereum-cryptography/bip39';
import { wordlist } from 'ethereum-cryptography/bip39/wordlists/english';
import { bytesToHex } from 'ethereum-cryptography/utils';
import { HDKey } from 'ethereum-cryptography/hdkey';

// Default HD path for Ethereum
const DEFAULT_HD_PATH = "m/44'/60'/0'/0/0";

describe('HD Wallet Functionality', () => {
  it('should generate a valid mnemonic phrase', () => {
    // Generate a mnemonic with default parameters (128 bits entropy = 12 words)
    const mnemonic = generateMnemonic(wordlist);
    
    console.log('Generated mnemonic:', mnemonic);
    
    // Validate the mnemonic
    expect(validateMnemonic(mnemonic, wordlist)).toBe(true);
    
    // Split into words and check word count
    const words = mnemonic.split(' ');
    expect(words.length).toBe(12);
  });
  
  it('should generate a 24-word mnemonic with higher entropy', () => {
    // Generate a mnemonic with 256 bits entropy (24 words)
    const mnemonic = generateMnemonic(wordlist, 256);
    
    console.log('Generated 24-word mnemonic:', mnemonic);
    
    // Validate the mnemonic
    expect(validateMnemonic(mnemonic, wordlist)).toBe(true);
    
    // Split into words and check word count
    const words = mnemonic.split(' ');
    expect(words.length).toBe(24);
  });
  
  it('should derive a key from mnemonic', () => {
    // This is a test mnemonic - NEVER use this in production!
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    
    // Validate the test mnemonic
    expect(validateMnemonic(testMnemonic, wordlist)).toBe(true);
    
    // Convert mnemonic to seed
    const seed = mnemonicToSeedSync(testMnemonic);
    const seedHex = bytesToHex(seed);
    
    console.log('Seed from mnemonic:', seedHex);
    
    // Create HD wallet from seed
    const hdKey = HDKey.fromMasterSeed(seed);
    
    // Derive the account private key using the Ethereum HD path
    const childKey = hdKey.derive(DEFAULT_HD_PATH);
    
    // Get the private key
    const privateKey = childKey.privateKey;
    if (!privateKey) {
      throw new Error('Failed to derive private key');
    }
    
    const privateKeyHex = bytesToHex(privateKey);
    console.log('Derived private key:', privateKeyHex);
    
    // This should be a consistent result for this test mnemonic
    expect(privateKeyHex).toBeTruthy();
    expect(privateKeyHex.length).toBe(64); // 32 bytes = 64 hex chars
  });
}); 