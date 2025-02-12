// contracts/config.ts
import { polygon, sepolia } from 'wagmi/chains';

const isDev = process.env.NODE_ENV === 'development';

export const SUPPORTED_CHAINS = isDev 
  ? [sepolia, polygon]
  : [polygon];

export const DEFAULT_CHAIN = isDev ? sepolia : polygon;

// Replace these with your actual contract addresses
export const CONTRACT_ADDRESSES = {
  TOKEN: {
    [polygon.id]: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c',
    [sepolia.id]: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c',
  },
  FORGE: {
    [polygon.id]: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    [sepolia.id]: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  },
} as const;