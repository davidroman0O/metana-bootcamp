import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ledger";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const LEDGER_ACCOUNT = process.env.LEDGER_ACCOUNT || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// Check for required environment variables
if (!SEPOLIA_RPC_URL) {
  console.warn("Warning: SEPOLIA_RPC_URL not set in .env file");
}

if (!LEDGER_ACCOUNT) {
  console.warn("Warning: LEDGER_ACCOUNT not set in .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      ledgerAccounts: [LEDGER_ACCOUNT],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
};

export default config;
