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
    [polygon.id]: '0x40f72956B507123Fe624394e1cF3Dc96D4727f4E',
  },
  FORGE: {
    [polygon.id]: '0x4B4CBEb364D26CC4aE6048BAB79A5C9961e4EC72',
  },
} as const;