require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-ledger");
require("@nomiclabs/hardhat-ethers");
// require("@nomiclabs/hardhat-waffle");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default hardhat account #0

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 20  // Optimize for size but not so aggressive that it breaks compilation
      }
    }
  },
  networks: {
    hardhat: {
      // Enable forking to access real mainnet contracts like Chainlink and Compound
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/UlgUe5NUoeezq_0_AxTSKl0qpQQeHSKV",
        blockNumber: 19000000 // Use a more recent block for better Uniswap liquidity
      },
      // Disable contract size limit for local testing
      allowUnlimitedContractSize: true,
      // Use local network settings for maximum flexibility
      chainId: 31337,
      // High gas settings for large contract deployments
      blockGasLimit: 30000000,
      // gasPrice: 8000000000, 
      gasPrice: 30000000000,
      // Use default hardhat accounts
    },
    hardhat_local: {
      // Local network without forking for basic tests
      url: "http://127.0.0.1:8545",
      allowUnlimitedContractSize: true
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      allowUnlimitedContractSize: true,
      // Gas settings for forked mainnet node
      gasPrice: 50000000000, // 50 gwei
      gas: 30000000,
      blockGasLimit: 30000000
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/UlgUe5NUoeezq_0_AxTSKl0qpQQeHSKV",
      chainId: 11155111, // Sepolia testnet chain ID
      ledgerAccounts: [
        process.env.LEDGER_ACCOUNT
      ],
      gasPrice: 50000000000 // 50 gwei
    }
  },
  etherscan: {
    enabled: true,
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  sourcify: {
    enabled: false
  }
};
