// Export configuration from environment variables with fallbacks
console.log(process.env);
export const SEPOLIA_CONFIG = {
  chainId: process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 11155111,
  rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/UlgUe5NUoeezq_0_AxTSKl0qpQQeHSKV', // this is restricted to the domain so don't try using it
  name: 'Sepolia',
  blockExplorer: process.env.BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io'
};

// Wallet configuration defaults
export const WALLET_CONFIG = {
  defaultTransactionType: 'eip1559', // Use EIP-1559 as default
  defaultWalletType: 'hd', // Use HD wallet as default
  minPriorityFeeGwei: 0.05, // Ultra-low priority fee for testnet
  gasPriceMultiplier: 1.005, // Minimal multiplier for gas costs (was 1.01)
  maxGasLimit: 30000, // Maximum gas limit to use (helps prevent excessive costs)
  minGasLimit: 21000, // Minimum gas limit (standard ETH transfer)
  confirmationBlocks: 1, // Number of blocks to wait for confirmation
  pollingInterval: 5000, // Poll for transaction status every 5 seconds
};