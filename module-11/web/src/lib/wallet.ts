import { keccak256 } from 'ethereum-cryptography/keccak';
import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { hexToBytes, bytesToHex, toHex } from 'ethereum-cryptography/utils';
import { RLP } from '@ethereumjs/rlp';
import {
  RawTransaction,
  PreparedTransaction,
  SignedTransaction,
  WalletKeyPair,
  BasicTxParams
} from '../types';
import { SEPOLIA_CONFIG } from '../config';

// Helper function to ensure hex strings are properly formatted for RPC
function normalizeHex(hex: string | number | bigint): string {
  if (typeof hex === 'number' || typeof hex === 'bigint') {
    // Handle zero case for numbers/bigints
    if (hex === 0 || hex === 0n) return '0x';
    hex = hex.toString(16);
  }
  // Handle zero/empty/nullish strings
  if (!hex || hex === '0' || hex === '0x' || hex === '0x0') return '0x';

  hex = hex.toLowerCase().replace(/^0x/, '');
  // Re-check if stripping '0x' resulted in empty string (was '0x')
  if (!hex) return '0x';

  return '0x' + hex;
}

// Helper to convert hex to bytes for RLP encoding, handling zero/empty
function hexToRlpBytes(hex: string): Uint8Array {
    // Remove 0x prefix if present
    hex = hex.replace(/^0x/, '');
    
    // If empty, return empty array
    if (!hex) return new Uint8Array([]); 
    
    // Ensure hex string is even-length (pad with 0 if needed)
    if (hex.length % 2 !== 0) {
        hex = '0' + hex; // Pad with leading zero for odd-length
    }
    
    return hexToBytes(hex);
}

// Generic JSON-RPC fetcher
async function fetchJsonRpc(method: string, params: any[] = [], rpcUrl: string = SEPOLIA_CONFIG.rpcUrl): Promise<any> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1, // Simple ID
        method,
        params,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP Error: ${response.status}`;
        console.error(`RPC Error (${method}):`, data.error || response.statusText);
        throw new Error(`RPC request failed: ${errorMsg}`);
    }

    if (data.error) {
        console.error(`RPC Error (${method}):`, data.error);
        throw new Error(data.error.message || 'RPC Error');
    }

    return data.result;
  } catch (error: any) {
    console.error(`RPC Fetch Error (${method}):`, error);
    throw new Error(`RPC request failed: ${error?.message || 'Unknown fetch error'}`);
  }
}

export function generateKeysPair(): WalletKeyPair {
  const privateKeyBytes = secp256k1.utils.randomPrivateKey();
  const privateKeyHex = bytesToHex(privateKeyBytes);
  
  // Get uncompressed public key (65 bytes, starts with 0x04)
  // Pass false as the second parameter to match Web3.js behavior
  const publicKeyBytesUncompressed = secp256k1.getPublicKey(privateKeyBytes, false);
  
  // Remove the 0x04 prefix for address calculation
  const publicKeyBytes = publicKeyBytesUncompressed.slice(1);
  const publicKeyHex = bytesToHex(publicKeyBytes); // 64 bytes hex
  
  // Hash the public key (excluding the 0x04 prefix)
  const addressBytes = keccak256(publicKeyBytes).slice(-20);
  const publicAddress = '0x' + bytesToHex(addressBytes);

  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
    address: publicAddress,
  };
}

export function getAddressFromPrivateKey(privateKeyHex: string): string {
    // Ensure the private key is properly formatted
    // Strip 0x prefix if present
    privateKeyHex = privateKeyHex.replace(/^0x/, '');
    
    if (!privateKeyHex.match(/^[0-9a-fA-F]{64}$/)) {
        throw new Error('Invalid private key format. Expected 64 hex characters.');
    }
    
    try {
        const privateKeyBytes = hexToBytes(privateKeyHex);
        
        // Get uncompressed public key
        // The key is passing false as the second parameter (it's a bit like Web3.js btu without it)
        const publicKeyBytesUncompressed = secp256k1.getPublicKey(privateKeyBytes, false);
        
        // remove the 0x04 prefix
        const publicKeyBytes = publicKeyBytesUncompressed.slice(1);
        
        // take the last 20 bytes as the address
        const addressBytes = keccak256(publicKeyBytes).slice(-20);
        
        // Add 0x prefix to the hex representation of the address
        return '0x' + bytesToHex(addressBytes);
    } catch (error: any) {
        console.error('Address derivation error:', error);
        throw new Error(`Failed to derive address: ${error?.message || 'Unknown error'}`);
    }
}

export async function getBalance(address: string): Promise<bigint> {
    if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
        throw new Error('Invalid Ethereum address format for getBalance');
    }
    const balanceHex = await fetchJsonRpc('eth_getBalance', [address, 'latest']);
    return BigInt(balanceHex);
}

export async function getNonce(address: string): Promise<number> {
    if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
        throw new Error('Invalid Ethereum address format for getNonce');
    }
    const nonceHex = await fetchJsonRpc('eth_getTransactionCount', [address, 'latest']);
    return parseInt(nonceHex, 16);
}

export async function getGasPrice(): Promise<bigint> {
    const gasPriceHex = await fetchJsonRpc('eth_gasPrice', []);
    console.log(`Raw gas price hex from RPC: ${gasPriceHex}`);
    return BigInt(gasPriceHex);
}

export async function estimateGas(txParams: BasicTxParams): Promise<bigint> {
    // Ensure required fields are present
    if (!txParams.from || !txParams.to) {
        throw new Error('"from" and "to" addresses are required for gas estimation.');
    }
    // Normalize hex values for RPC call
    const params = {
        from: normalizeHex(txParams.from),
        to: normalizeHex(txParams.to),
        value: txParams.value ? normalizeHex(txParams.value) : '0x0',
        data: txParams.data ? normalizeHex(txParams.data) : '0x',
    };
    const gasHex = await fetchJsonRpc('eth_estimateGas', [params]);
    return BigInt(gasHex);
}

export async function sendRawTransaction(signedTxHex: string): Promise<string> {
    if (!signedTxHex || !signedTxHex.startsWith('0x')) {
        throw new Error('Invalid signed transaction hex format');
    }
    return await fetchJsonRpc('eth_sendRawTransaction', [signedTxHex]);
}

export function prepareTransaction(transaction: RawTransaction): PreparedTransaction {
    // The key issue is that transaction.nonce may not be a number (could be bigint),
    // and we need to ensure we're handling nonce correctly in RLP encoding
    
    // Convert numeric types to BigInt to ensure consistent handling
    const nonce = typeof transaction.nonce === 'number' ? BigInt(transaction.nonce) : transaction.nonce;
    const gasPrice = typeof transaction.gasPrice === 'number' ? BigInt(transaction.gasPrice) : transaction.gasPrice;
    const gasLimit = typeof transaction.gasLimit === 'number' ? BigInt(transaction.gasLimit) : transaction.gasLimit;
    const value = typeof transaction.value === 'number' ? BigInt(transaction.value) : transaction.value;
    
    // Debug logging
    console.log('Preparing transaction with:');
    console.log('- nonce:', nonce, typeof nonce);
    console.log('- gasPrice:', gasPrice, typeof gasPrice);
    console.log('- gasLimit:', gasLimit, typeof gasLimit);
    console.log('- to:', transaction.to);
    console.log('- value:', value, typeof value);
    console.log('- data:', transaction.data);
    console.log('- chainId:', transaction.chainId);
    
    // RLP requires specific handling for zero/empty values
    // Convert each value to its proper RLP format
    const txData = [
        // For RLP, numbers need to be minimal-length big-endian byte arrays
        nonce === 0n ? new Uint8Array([]) : hexToRlpBytes(nonce.toString(16)),
        gasPrice === 0n ? new Uint8Array([]) : hexToRlpBytes(gasPrice.toString(16)),
        gasLimit === 0n ? new Uint8Array([]) : hexToRlpBytes(gasLimit.toString(16)),
        hexToRlpBytes(transaction.to), // Address must be bytes
        value === 0n ? new Uint8Array([]) : hexToRlpBytes(value.toString(16)),
        hexToRlpBytes(transaction.data), // Data must be bytes
        // For EIP-155, we include chainId, empty r, empty s
        transaction.chainId,
        new Uint8Array([]), // r
        new Uint8Array([]), // s
    ];

    // RLP encode the unsigned transaction structure (including chainId, r=0, s=0 for EIP-155 hashing)
    const encodedTx = RLP.encode(txData);

    // Hash the RLP encoded structure
    const messageHash = keccak256(encodedTx);

    return {
        messageHash,
        encodedTx,
        txData: txData.slice(0, 6), // Return only the core fields needed for signing
    };
}

export function signTransaction(preparedTx: PreparedTransaction, privateKeyHex: string, chainId: number): SignedTransaction {
    try {
        // Ensure proper private key format (handle 0x prefix)
        privateKeyHex = privateKeyHex.replace(/^0x/, '');
        
        if (!privateKeyHex.match(/^[0-9a-fA-F]{64}$/)) {
            throw new Error('Invalid private key format. Expected 64 hex characters.');
        }
        const privateKeyBytes = hexToBytes(privateKeyHex);

        // Sign the hash
        // Note: ethereum-cryptography secp256k1.sign already returns low-s normalized signature
        const signature = secp256k1.sign(preparedTx.messageHash, privateKeyBytes);

        // Calculate v value according to EIP-155
        // v = recoveryId + chainId * 2 + 35
        const v = signature.recovery + (chainId * 2) + 35;

        // Create the RLP-encodable structure for the signed transaction
        const signedTxData = [
            ...preparedTx.txData, // nonce, gasPrice, gasLimit, to, value, data
            v,
            signature.r,
            signature.s,
        ];

        // RLP encode the signed transaction
        const signedTxBytes = RLP.encode(signedTxData);
        const serializedHex = '0x' + bytesToHex(signedTxBytes);

        return {
            v,
            r: signature.r,
            s: signature.s,
            serialized: serializedHex,
            // Optionally store the original signature object if needed elsewhere
        };
    } catch (error: any) {
        console.error("Signing error:", error);
        throw new Error(`Error signing transaction: ${error?.message || 'Unknown signing error'}`);
    }
}

export function getTransactionUrl(txHash: string): string {
  return `${SEPOLIA_CONFIG.blockExplorer}/tx/${txHash}`;
} 