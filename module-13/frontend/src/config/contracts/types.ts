// Common types for all contract deployments
export interface ContractAddresses {
  CASINO_SLOT: `0x${string}`;
  PAYOUT_TABLES?: `0x${string}`;
  VRF_COORDINATOR?: `0x${string}`;
  ETH_USD_PRICE_FEED?: `0x${string}`;
}

export interface DeploymentInfo {
  network: string;
  chainId: number;
  timestamp: string;
  deployer: `0x${string}`;
  vrfSubscriptionId?: number;
  exchangeRates?: {
    ethPriceUSDCents: string;
    chipsPerETH: string;
    targetChipPriceUSD: string;
  };
}

export interface NetworkDeployment {
  addresses: ContractAddresses;
  info: DeploymentInfo;
}

// Network identification
export const SUPPORTED_CHAINS = {
  HARDHAT: 31337,
  SEPOLIA: 11155111,
  MAINNET: 1,
} as const;

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

// Network and Environment types
export type NetworkName = 'hardhat' | 'sepolia' | 'mainnet';
export type Environment = 'dev' | 'test' | 'staging' | 'prod';

// Deployment structure: Network -> Environment -> Deployment
export type NetworkDeployments = Record<Environment, NetworkDeployment>;
export type AllDeployments = Partial<Record<NetworkName, Partial<NetworkDeployments>>>;
