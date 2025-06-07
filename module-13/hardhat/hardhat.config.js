require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
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
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      // Enable forking for mainnet testing - REQUIRED
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/UlgUe5NUoeezq_0_AxTSKl0qpQQeHSKV",
        blockNumber: 18500000 // Use a recent block
      },
      // Use default hardhat accounts
    },
    hardhat_local: {
      // Local network without forking for basic tests
      url: "http://127.0.0.1:8545"
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/UlgUe5NUoeezq_0_AxTSKl0qpQQeHSKV",
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
