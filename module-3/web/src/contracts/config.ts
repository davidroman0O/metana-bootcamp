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
    [polygon.id]: '0xf41C0CbB57F655a33e48d5dD9e833f0B5DdFAf2e',
  },
  FORGE: {
    [polygon.id]: '0xD79E9c2B963fD21CAD8d40E2968c87a3D7Cce0b0',
  },
} as const;