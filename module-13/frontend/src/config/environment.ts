// Environment configuration for network selection
export const isDevelopment = 
  process.env.NODE_ENV === 'development' || 
  process.env.REACT_APP_ENV === 'development' ||
  process.env.REACT_APP_SHOW_DEV_NETWORKS === 'true' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '3000';

export const isProduction = process.env.NODE_ENV === 'production' && !isDevelopment;

// Check if user specifically wants hardhat as default
const forceHardhatDefault = process.env.REACT_APP_DEFAULT_NETWORK === 'hardhat' ||
                            process.env.REACT_APP_FORCE_LOCAL === 'true';

// Network availability based on environment
export const getAvailableNetworkIds = (): string[] => {
  const networks: string[] = [];
  
  // Always include sepolia first (we have deployments there)
  networks.push('sepolia');
  
  // Include hardhat in development (we have deployments there)
  if (isDevelopment) {
    if (forceHardhatDefault) {
      // If explicitly requested, put hardhat first
      networks.unshift('hardhat');
    } else {
      // Otherwise add hardhat as secondary option
      networks.push('hardhat');
    }
  }
  
  return networks;
};

// Get default network based on environment
export const getDefaultNetworkId = (): string => {
  // If user specifically wants hardhat in development
  if (isDevelopment && forceHardhatDefault) {
    return 'hardhat';
  }
  // Otherwise always default to sepolia
  return 'sepolia';
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  isDevelopment,
  isProduction,
  forceHardhatDefault,
  nodeEnv: process.env.NODE_ENV,
  reactAppEnv: process.env.REACT_APP_ENV,
  showDevNetworks: process.env.REACT_APP_SHOW_DEV_NETWORKS,
  defaultNetworkEnv: process.env.REACT_APP_DEFAULT_NETWORK,
  forceLocal: process.env.REACT_APP_FORCE_LOCAL,
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