module.exports = {
  buildDir: 'artifacts',
  contractsDir: 'contracts',
  testDir: 'test',
  skipContracts: [], // List contracts to exclude from mutation testing
  skipTests: [],     // List tests to exclude
  testingTimeOutInSec: 300,
  network: "none",
  testingFramework: "hardhat",
  minimal: false,
  tce: false
};
