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
    [polygon.id]: '0x78d1bEE160a5B00aCB4CfFD8F1dFB4FD00A09287',
  },
  FORGE: {
    [polygon.id]: '0x50B4701eC8E0795f1BA5701e5ACC6172FbAcE04B',
  },
} as const;