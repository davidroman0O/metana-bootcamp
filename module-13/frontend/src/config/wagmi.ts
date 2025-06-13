import { getContractAddresses, type ContractAddresses } from './contracts';
import { createConfig, http } from '@wagmi/core';
import { mainnet, localhost, sepolia } from '@wagmi/core/chains';
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

// Configure wagmi without WalletConnect to avoid demo project ID issues
export const config = createConfig({
  chains: [mainnet, hardhatLocal, sepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [mainnet.id]: http(),
    [hardhatLocal.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
  },
});

// Contract addresses with proper typing using new structure
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  [mainnet.id]: {
    CASINO_SLOT: process.env.REACT_APP_CASINO_SLOT_MAINNET as Address || "0x" as Address,
  },
  [hardhatLocal.id]: getContractAddresses('hardhat', 'dev'),
  [sepolia.id]: {
    CASINO_SLOT: process.env.REACT_APP_CASINO_SLOT_SEPOLIA as Address || "0x" as Address,
  },
};

// Export the chain IDs for easy reference
export const SUPPORTED_CHAINS = {
  MAINNET: mainnet.id,
  HARDHAT_LOCAL: hardhatLocal.id,
  SEPOLIA: sepolia.id,
} as const;

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS]; 