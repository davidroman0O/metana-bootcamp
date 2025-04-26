
// Raw transaction structure before signing
export interface RawTransaction {
  nonce: number | bigint;  // Allow both number and bigint for nonce
  gasPrice: bigint;        // Use bigint for gas price
  gasLimit: bigint;        // Use bigint for gas limit
  to: string;              // Address (hex string)
  value: bigint;           // Use bigint for value
  data: string;            // Hex string (e.g., '0x')
  chainId: number;         // Network chain ID
}

// Intermediate structure after preparing for signing
export interface PreparedTransaction {
  messageHash: Uint8Array; // Hash of the RLP-encoded transaction
  encodedTx: Uint8Array;   // RLP-encoded transaction data (unsigned)
  txData: (number | bigint | Uint8Array | string)[]; // Array of fields before RLP encoding
}

// Structure after signing
export interface SignedTransaction {
  v: number;             // Recovery ID + EIP-155 calculation
  r: bigint;             // Signature r value
  s: bigint;             // Signature s value
  serialized: string;    // RLP-encoded signed transaction (hex string)
  hash?: string;          // Optional: Transaction hash after broadcasting
  url?: string;           // Optional: Block explorer URL
}

// Structure for wallet key pair
export interface WalletKeyPair {
  privateKey: string;     // Hex string
  publicKey: string;      // Hex string (uncompressed, without 04 prefix)
  address: string;        // Hex string (with 0x prefix)
}

// Structure for basic transaction parameters used in estimation
export interface BasicTxParams {
    from: string;
    to: string;
    value?: string; // Hex string
    data?: string;  // Hex string
}