// Raw transaction structure before signing
export interface RawTransaction {
  nonce: number | bigint;  // Allow both number and bigint for nonce
  gasLimit: bigint;        // Use bigint for gas limit
  to: string;              // Address (hex string)
  value: bigint;           // Use bigint for value
  data: string;            // Hex string (e.g., '0x')
  chainId: number;         // Network chain ID
  
  // Legacy transaction field
  gasPrice?: bigint;       // Legacy gas price (pre-EIP-1559)
  
  // EIP-1559 transaction fields
  maxFeePerGas?: bigint;   // Maximum fee per gas (EIP-1559)
  maxPriorityFeePerGas?: bigint; // Maximum priority fee (tip) per gas (EIP-1559)
  
  // Transaction type
  type?: 'legacy' | 'eip1559'; // Default is 'eip1559' when gasPrice is not provided, 'legacy' when gasPrice is provided
}

// Intermediate structure after preparing for signing
export interface PreparedTransaction {
  messageHash: Uint8Array; // Hash of the RLP-encoded transaction
  encodedTx: Uint8Array;   // RLP-encoded transaction data (unsigned)
  txData: (number | bigint | Uint8Array | string)[]; // Array of fields before RLP encoding
  txType: 'legacy' | 'eip1559'; // Transaction type
}

// Structure after signing
export interface SignedTransaction {
  v: number;             // Recovery ID + EIP-155 calculation
  r: bigint;             // Signature r value
  s: bigint;             // Signature s value
  serialized: string;    // RLP-encoded signed transaction (hex string)
  hash?: string;          // Optional: Transaction hash after broadcasting
  url?: string;           // Optional: Block explorer URL
  type: 'legacy' | 'eip1559'; // Transaction type
  
  // Additional properties for transaction receipt/confirmation data
  actualGasUsed?: bigint;  // Gas actually used by the transaction
  blockNumber?: number;    // Block number where transaction was confirmed
  status?: 'success' | 'failed'; // Transaction execution status
  actualCost?: bigint;     // Actual cost of the transaction
}

// HD Wallet information structure
export interface HDWalletInfo {
  mnemonic: string;      // BIP-39 mnemonic phrase
  seed: string;          // Hex-encoded seed derived from mnemonic
  hdPath: string;        // Derivation path (e.g., m/44'/60'/0'/0/0 for Ethereum)
  accountIndex: number;  // Current account index
}

// Structure for wallet key pair
export interface WalletKeyPair {
  privateKey: string;     // Hex string
  publicKey: string;      // Hex string (uncompressed, without 04 prefix)
  address: string;        // Hex string (with 0x prefix)
  hdWallet?: HDWalletInfo; // Optional: HD Wallet information if using mnemonic
}

// Structure for basic transaction parameters used in estimation
export interface BasicTxParams {
    from: string;
    to: string;
    value?: string; // Hex string
    data?: string;  // Hex string
}

// Wallet type
export enum WalletType {
  SIMPLE = 'simple',    // Simple private key wallet
  HD = 'hd'             // HD wallet with mnemonic
}