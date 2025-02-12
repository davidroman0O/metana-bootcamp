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
    [polygon.id]: '0xF61Cce508003e372Faf0f7162f5944d40c534186',
  },
  FORGE: {
    [polygon.id]: '0x042397d98fa5CcDAd97F79De0b686f2F9EBA5679',
  },
} as const;