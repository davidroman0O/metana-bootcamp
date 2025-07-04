// Network configuration utility
const fs = require('fs');
const path = require('path');

/**
 * Get network configuration for contract deployment
 * @param {string} networkName - The network name (e.g., 'sepolia', 'mainnet')
 * @returns {object} Network configuration object
 */
function getNetworkConfig(networkName) {
  // Default to sepolia if not specified
  const network = networkName || 'sepolia';
  
  // Try to load from deployment file first
  try {
    const deploymentPath = path.join(__dirname, '../../deployments', `deployment-${getChainId(network)}.json`);
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      
      // Extract constructor parameters from the CasinoSlot deployment
      const constructor = deploymentData.contracts.CasinoSlot.constructor;
      
      return {
        ethUsdPriceFeed: constructor.ethUsdPriceFeed,
        linkUsdPriceFeed: constructor.linkUsdPriceFeed,
        linkToken: constructor.linkToken,
        vrfV2PlusWrapper: constructor.vrfWrapper,
        uniswapV2Router: constructor.uniswapRouter
      };
    }
  } catch (error) {
    console.warn(`Warning: Could not load deployment data for ${network}: ${error.message}`);
  }
  
  // Fallback to hardcoded values if deployment file not found
  return getHardcodedConfig(network);
}

/**
 * Get chain ID for a network name
 * @param {string} networkName - The network name
 * @returns {string} Chain ID
 */
function getChainId(networkName) {
  const networkMap = {
    'mainnet': '1',
    'goerli': '5',
    'sepolia': '11155111',
    'localhost': '31337',
    'hardhat': '31337'
  };
  
  return networkMap[networkName] || '11155111'; // Default to sepolia
}

/**
 * Get hardcoded configuration for a network
 * @param {string} networkName - The network name
 * @returns {object} Network configuration object
 */
function getHardcodedConfig(networkName) {
  // Sepolia configuration
  if (networkName === 'sepolia') {
    return {
      ethUsdPriceFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // ETH/USD Sepolia
      linkUsdPriceFeed: '0xc59E3633BAAC79493d908e63626716e204A45EdF', // LINK/USD Sepolia
      linkToken: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // LINK token Sepolia
      vrfV2PlusWrapper: '0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1', // VRF V2.5 Wrapper Sepolia
      uniswapV2Router: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008' // Uniswap V2 Router Sepolia
    };
  }
  
  // Local development configuration
  if (networkName === 'localhost' || networkName === 'hardhat') {
    return {
      ethUsdPriceFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Use Sepolia addresses for local testing
      linkUsdPriceFeed: '0xc59E3633BAAC79493d908e63626716e204A45EdF',
      linkToken: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      vrfV2PlusWrapper: '0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1',
      uniswapV2Router: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008'
    };
  }
  
  // Default to sepolia if network not recognized
  return getHardcodedConfig('sepolia');
}

module.exports = {
  getNetworkConfig,
  getChainId
}; 