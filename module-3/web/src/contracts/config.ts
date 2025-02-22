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
    [polygon.id]: '0x805688F28CaF4A6D4ADC48748c5d24B33F1e0Ed0',
  },
  FORGE: {
    [polygon.id]: '0x021652cd346a59beDB1A30ed7391ECFfDFA31366',
  },
} as const;