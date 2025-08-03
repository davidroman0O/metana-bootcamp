import * as fs from "fs";
import * as path from "path";

export interface DeploymentAddresses {
  network: string;
  deployedAt: string;
  contracts: {
    GovernanceToken?: string;
    Timelock?: string;
    DAOGovernor?: string;
  };
  configuration?: any;
}

export function saveAddresses(addresses: DeploymentAddresses, networkName: string): string {
  // Create addresses directory if it doesn't exist
  const addressesDir = path.join(__dirname, "../addresses");
  if (!fs.existsSync(addressesDir)) {
    fs.mkdirSync(addressesDir, { recursive: true });
  }

  // Save addresses to file
  const addressesPath = path.join(addressesDir, `${networkName}.json`);
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  
  console.log(`💾 Addresses saved to ${addressesPath}`);
  return addressesPath;
}

export function loadAddresses(networkName: string): DeploymentAddresses | null {
  const addressesPath = path.join(__dirname, "../addresses", `${networkName}.json`);
  
  if (!fs.existsSync(addressesPath)) {
    console.log(`❌ No addresses found for network: ${networkName}`);
    return null;
  }
  
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  return addresses;
}

export function getContractAddress(contractName: string, networkName: string = "hardhat"): string | null {
  const addresses = loadAddresses(networkName);
  if (!addresses) return null;
  
  return addresses.contracts[contractName as keyof typeof addresses.contracts] || null;
}