import { getContractAddresses, type ContractAddresses } from './contracts';
import { createConfig, http } from '@wagmi/core';
import { sepolia } from '@wagmi/core/chains';
import { injected, metaMask } from '@wagmi/connectors';
import type { Address } from 'viem';

// Define custom localhost chain for hardhat
const hardhatLocal = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Local Explorer', url: 'http://localhost:8545' },
  },
  testnet: true,
} as const;

// Alchemy RPC URLs - use environment variables for better performance
const ALCHEMY_SEPOLIA_KEY = process.env.REACT_APP_ALCHEMY_SEPOLIA_KEY || 'v83-dLeu2iggxlm9foHin';
const ALCHEMY_SEPOLIA_URL = process.env.REACT_APP_CUSTOM_SEPOLIA_RPC || `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_SEPOLIA_KEY}`;

// Configure wagmi - SEPOLIA FIRST as default, then hardhat
export const config = createConfig({
  chains: [sepolia, hardhatLocal],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http(ALCHEMY_SEPOLIA_URL, {
      timeout: 120000, // 2 minute timeout for Sepolia (slower network)
    }),
    [hardhatLocal.id]: http('http://127.0.0.1:8545', {
      timeout: 10000, // 10 second timeout for local
    }),
  },
});

// Contract addresses with proper typing using new structure
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  [hardhatLocal.id]: getContractAddresses('hardhat', 'dev'),
  [sepolia.id]: getContractAddresses('sepolia', 'dev'),
};

// Export the chain IDs for easy reference
export const SUPPORTED_CHAINS = {
  HARDHAT_LOCAL: hardhatLocal.id,
  SEPOLIA: sepolia.id,
} as const;

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS]; 