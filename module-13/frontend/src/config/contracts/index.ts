// Auto-generated contract configuration entry point
import type { NetworkDeployment, AllDeployments, NetworkName, Environment } from './types';
import { SUPPORTED_CHAINS } from './types';
import { HARDHAT_DEV_DEPLOYMENT } from './hardhat-dev';

export * from './types';
export * from './CasinoSlotABI';

export { HARDHAT_DEV_DEPLOYMENT } from './hardhat-dev';

// Network -> Environment -> Deployment structure
const DEPLOYMENTS: AllDeployments = {
  hardhat: {
    dev: HARDHAT_DEV_DEPLOYMENT,
  },
};

/**
 * Get contract deployment for network + environment
 */
export function getDeployment(network: NetworkName, env: Environment): NetworkDeployment {
  const networkDeployments = DEPLOYMENTS[network];
  if (!networkDeployments) {
    throw new Error(`No deployments found for network: ${network}. Available networks: ${Object.keys(DEPLOYMENTS).join(', ')}`);
  }
  
  const deployment = networkDeployments[env];
  if (!deployment) {
    const availableEnvs = Object.keys(networkDeployments).join(', ');
    throw new Error(`No deployment found for ${network}-${env}. Available environments for ${network}: ${availableEnvs}`);
  }
  
  return deployment;
}

/**
 * Get contract addresses for network + environment
 */
export function getContractAddresses(network: NetworkName, env: Environment) {
  return getDeployment(network, env).addresses;
}

/**
 * Get all available networks
 */
export function getAvailableNetworks(): NetworkName[] {
  return Object.keys(DEPLOYMENTS) as NetworkName[];
}

/**
 * Get available environments for a network
 */
export function getAvailableEnvironments(network: NetworkName): Environment[] {
  return Object.keys(DEPLOYMENTS[network] || {}) as Environment[];
}

export { SUPPORTED_CHAINS };
