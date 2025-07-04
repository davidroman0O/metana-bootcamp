// Environment configuration for network selection
export const isDevelopment = 
  process.env.NODE_ENV === 'development' || 
  process.env.REACT_APP_ENV === 'development' ||
  process.env.REACT_APP_SHOW_DEV_NETWORKS === 'true' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '3000';

export const isProduction = process.env.NODE_ENV === 'production' && !isDevelopment;

// Network availability based on environment
export const getAvailableNetworkIds = (): string[] => {
  const networks: string[] = [];
  
  // Always include sepolia (we have deployments there)
  networks.push('sepolia');
  
  // Only include hardhat in development (we have deployments there)
  if (isDevelopment) {
    networks.unshift('hardhat'); // Add at beginning to make it default
  }
  
  return networks;
};

// Get default network based on environment
export const getDefaultNetworkId = (): string => {
  return isDevelopment ? 'hardhat' : 'sepolia';
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  isDevelopment,
  isProduction,
  nodeEnv: process.env.NODE_ENV,
  reactAppEnv: process.env.REACT_APP_ENV,
  showDevNetworks: process.env.REACT_APP_SHOW_DEV_NETWORKS,
  hostname: window.location.hostname,
  port: window.location.port,
  availableNetworks: getAvailableNetworkIds(),
  defaultNetwork: getDefaultNetworkId(),
});

export default {
  isDevelopment,
  isProduction,
  getAvailableNetworkIds,
  getDefaultNetworkId,
  getEnvironmentInfo,
}; 