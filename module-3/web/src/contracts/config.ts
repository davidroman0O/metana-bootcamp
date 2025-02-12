// contracts/config.ts
import { anvil, polygon, sepolia } from 'wagmi/chains';

const isDev = process.env.NODE_ENV === 'development';

export const SUPPORTED_CHAINS = isDev 
  // ? [sepolia, polygon]
  ? [polygon]
  : [polygon];

export const DEFAULT_CHAIN = isDev ? anvil : polygon;

// Replace these with your actual contract addresses
export const CONTRACT_ADDRESSES = {
  TOKEN: {
    [polygon.id]: '0xFb9DC938DE68A2F8daAfFf7493c486d6f8cc73D2',
  },
  FORGE: {
    [polygon.id]: '0xE2e1dc06094Ba241fAB4A0f93eFd9DB8a0880d53',
  },
} as const;