import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
  mocha: {
    reporter: 'spec',
  },
  gasReporter: {
    enabled: true,
  },
};

export default config;