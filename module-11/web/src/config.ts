// Export configuration from environment variables with fallbacks
console.log(process.env);
export const SEPOLIA_CONFIG = {
  chainId: process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 11155111,
  rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/UlgUe5NUoeezq_0_AxTSKl0qpQQeHSKV', // this is restricted to the domain so don't try using it
  name: 'Sepolia',
  blockExplorer: process.env.BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io'
};