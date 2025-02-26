import { Address } from 'viem';

export type BlockData = {
  blockNumber: number;
  timestamp: number;
  baseFee: number;
  gasUsed: number;
  gasLimit: number;
  gasUsedRatio: number; 
  transferVolume: number;
};

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type NotificationItem = {
  id: number;
  message: string;
  type: NotificationType;
};

export type TokenInfo = {
  name: string;
  address: Address;
  decimals: number;
};