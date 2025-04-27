import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-ledger";
import * as dotenv from "dotenv";

dotenv.config();

const ALCHEMY_API_URL = process.env.ALCHEMY_API_URL || "";

const LEDGER_ACCOUNT = process.env.LEDGER_ACCOUNT || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
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
      url: ALCHEMY_API_URL,
      ledgerAccounts: [LEDGER_ACCOUNT],
      chainId: 11155111
    }
  }
};

export default config;
