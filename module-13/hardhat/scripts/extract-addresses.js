const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function extractAddresses() {
  console.log("🚀 Extracting contract addresses for frontend...");

  try {
    // First, compile contracts to ensure fresh ABIs
    console.log("🔨 Compiling smart contracts...");
    await hre.run("compile");
    console.log("✅ Smart contracts compiled successfully");

    // Read deployment data
    const deploymentDir = path.join(__dirname, "../deployments");
    const hardhatDeploymentFile = path.join(deploymentDir, "deployment-31337.json");
    
    if (!fs.existsSync(hardhatDeploymentFile)) {
      console.error("❌ Deployment file not found:", hardhatDeploymentFile);
      console.error("Please run deployment first: npm run deploy:fork");
      process.exit(1);
    }

    const deploymentData = JSON.parse(fs.readFileSync(hardhatDeploymentFile, "utf8"));
    console.log("📊 Read deployment data for network:", deploymentData.network.chainId);

    // Extract contract addresses
    const degenSlotsAddress = deploymentData.contracts.DegenSlots.address;
    const chipTokenAddress = deploymentData.contracts.ChipToken.address;

    console.log("DegenSlots address:", degenSlotsAddress);
    console.log("ChipToken address:", chipTokenAddress);

    // Frontend config directory
    const frontendConfigDir = path.join(__dirname, "../../frontend/src/config/contracts");
    if (!fs.existsSync(frontendConfigDir)) {
      fs.mkdirSync(frontendConfigDir, { recursive: true });
    }

    // Determine network and environment
    const chainId = deploymentData.network.chainId;
    const networkName = getNetworkName(chainId);
    const environment = mapEnvironment(process.env.NODE_ENV || 'dev');
    
    console.log(`🌐 Network: ${networkName}, Environment: ${environment}`);

    // Generate network + environment specific file
    await generateNetworkEnvFile(frontendConfigDir, networkName, environment, {
      degenSlotsAddress,
      chipTokenAddress,
      deploymentData
    });

    // Generate types file
    await generateTypesFile(frontendConfigDir);

    // Generate or update ABIs
    await generateABIs(frontendConfigDir, deploymentData);

    // Update index file
    await updateIndexFile(frontendConfigDir);

    console.log("\n🎉 Contract addresses successfully extracted!");
    console.log(`📁 Generated: ${networkName}-${environment}.ts, types.ts, ABIs, and index.ts`);

  } catch (error) {
    console.error("❌ Failed to extract addresses:", error);
    process.exit(1);
  }
}

function getNetworkName(chainId) {
  const networks = {
    31337: 'hardhat',
    11155111: 'sepolia', 
    1: 'mainnet'
  };
  return networks[chainId] || 'unknown';
}

function mapEnvironment(nodeEnv) {
  const envMap = {
    'development': 'dev',
    'dev': 'dev',
    'test': 'test',
    'testing': 'test',
    'staging': 'staging',
    'production': 'prod',
    'prod': 'prod'
  };
  return envMap[nodeEnv] || 'dev';
}

async function generateNetworkEnvFile(configDir, network, env, { degenSlotsAddress, chipTokenAddress, deploymentData }) {
  const filename = `${network}-${env}.ts`;
  const exportName = `${network.toUpperCase()}_${env.toUpperCase()}_DEPLOYMENT`;
  
  const chainlinkAddresses = getChainlinkAddresses(deploymentData.network.chainId);
  
  const content = `// ${network.charAt(0).toUpperCase() + network.slice(1)} ${env.charAt(0).toUpperCase() + env.slice(1)} Environment
// Auto-generated at: ${deploymentData.network.timestamp}
import type { NetworkDeployment } from './types';

export const ${exportName}: NetworkDeployment = {
  addresses: {
    DEGEN_SLOTS: "${degenSlotsAddress}",
    CHIP_TOKEN: "${chipTokenAddress}",${chainlinkAddresses ? `
    VRF_COORDINATOR: "${chainlinkAddresses.vrfCoordinator}",
    ETH_USD_PRICE_FEED: "${chainlinkAddresses.ethUsdPriceFeed}",` : ''}
  },
  info: {
    network: "${network}",
    chainId: ${deploymentData.network.chainId},
    timestamp: "${deploymentData.network.timestamp}",
    deployer: "${deploymentData.deployer}",${deploymentData.exchangeRates ? `
    exchangeRates: {
      ethPriceUSDCents: "${deploymentData.exchangeRates.ethPriceUSDCents}",
      chipsPerETH: "${deploymentData.exchangeRates.chipsPerETH}",
      targetChipPriceUSD: "${deploymentData.exchangeRates.targetChipPriceUSD}"
    },` : ''}
  }
};
`;

  const filePath = path.join(configDir, filename);
  fs.writeFileSync(filePath, content);
  console.log(`✅ Generated: ${filename}`);
}

async function generateTypesFile(configDir) {
  const typesContent = `// Common types for all contract deployments
export interface ContractAddresses {
  DEGEN_SLOTS: \`0x\${string}\`;
  CHIP_TOKEN: \`0x\${string}\`;
  PAYOUT_TABLES?: \`0x\${string}\`;
  VRF_COORDINATOR?: \`0x\${string}\`;
  ETH_USD_PRICE_FEED?: \`0x\${string}\`;
}

export interface DeploymentInfo {
  network: string;
  chainId: number;
  timestamp: string;
  deployer: \`0x\${string}\`;
  vrfSubscriptionId?: number;
  exchangeRates?: {
    ethPriceUSDCents: string;
    chipsPerETH: string;
    targetChipPriceUSD: string;
  };
}

export interface NetworkDeployment {
  addresses: ContractAddresses;
  info: DeploymentInfo;
}

// Network identification
export const SUPPORTED_CHAINS = {
  HARDHAT: 31337,
  SEPOLIA: 11155111,
  MAINNET: 1,
} as const;

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

// Network and Environment types
export type NetworkName = 'hardhat' | 'sepolia' | 'mainnet';
export type Environment = 'dev' | 'test' | 'staging' | 'prod';

// Deployment structure: Network -> Environment -> Deployment
export type NetworkDeployments = Record<Environment, NetworkDeployment>;
export type AllDeployments = Partial<Record<NetworkName, Partial<NetworkDeployments>>>;
`;

  const typesFile = path.join(configDir, "types.ts");
  fs.writeFileSync(typesFile, typesContent);
  console.log("✅ Generated: types.ts");
}

function getChainlinkAddresses(chainId) {
  const addresses = {
    1: { // Mainnet
      vrfCoordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
      ethUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
    },
    11155111: { // Sepolia
      vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625", 
      ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306"
    },
    31337: null // Hardhat - uses mocks
  };
  
  return addresses[chainId];
}

async function generateABIs(configDir, deploymentData) {
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  
  // DegenSlots ABI
  const degenSlotsArtifact = path.join(artifactsDir, "DegenSlots.sol/DegenSlots.json");
  if (fs.existsSync(degenSlotsArtifact)) {
    const artifact = JSON.parse(fs.readFileSync(degenSlotsArtifact, "utf8"));
    const abiContent = `// Auto-generated ABI for DegenSlots contract
// Generated at: ${deploymentData.network.timestamp}

export const DegenSlotsABI = ${JSON.stringify(artifact.abi, null, 2)} as const;

export type DegenSlotsABI = typeof DegenSlotsABI;
`;
    
    const abiFile = path.join(configDir, "DegenSlotsABI.ts");
    fs.writeFileSync(abiFile, abiContent);
    console.log("✅ Generated: DegenSlotsABI.ts");
  }

  // ChipToken ABI
  const chipTokenArtifact = path.join(artifactsDir, "ChipToken.sol/ChipToken.json");
  if (fs.existsSync(chipTokenArtifact)) {
    const artifact = JSON.parse(fs.readFileSync(chipTokenArtifact, "utf8"));
    const abiContent = `// Auto-generated ABI for ChipToken contract
// Generated at: ${deploymentData.network.timestamp}

export const ChipTokenABI = ${JSON.stringify(artifact.abi, null, 2)} as const;

export type ChipTokenABI = typeof ChipTokenABI;
`;
    
    const abiFile = path.join(configDir, "ChipTokenABI.ts");
    fs.writeFileSync(abiFile, abiContent);
    console.log("✅ Generated: ChipTokenABI.ts");
  }
}

async function updateIndexFile(configDir) {
  // Scan for all network-env files
  const files = fs.readdirSync(configDir);
  const networkEnvFiles = files.filter(f => f.match(/^(hardhat|sepolia|mainnet)-(dev|test|staging|prod)\.ts$/));
  
  let imports = networkEnvFiles.map(file => {
    const [network, env] = file.replace('.ts', '').split('-');
    const exportName = `${network.toUpperCase()}_${env.toUpperCase()}_DEPLOYMENT`;
    return `import { ${exportName} } from './${file.replace('.ts', '')}';`;
  }).join('\n');
  
  let exports = networkEnvFiles.map(file => {
    const [network, env] = file.replace('.ts', '').split('-');
    const exportName = `${network.toUpperCase()}_${env.toUpperCase()}_DEPLOYMENT`;
    return `export { ${exportName} } from './${file.replace('.ts', '')}';`;
  }).join('\n');

  const indexContent = `// Auto-generated contract configuration entry point
import type { NetworkDeployment, AllDeployments, NetworkName, Environment } from './types';
import { SUPPORTED_CHAINS } from './types';
${imports}

export * from './types';
export * from './DegenSlotsABI';
export * from './ChipTokenABI';

${exports}

// Network -> Environment -> Deployment structure
const DEPLOYMENTS: AllDeployments = {
${generateNestedDeployments(networkEnvFiles)}
};

/**
 * Get contract deployment for network + environment
 */
export function getDeployment(network: NetworkName, env: Environment): NetworkDeployment {
  const networkDeployments = DEPLOYMENTS[network];
  if (!networkDeployments) {
    throw new Error(\`No deployments found for network: \${network}. Available networks: \${Object.keys(DEPLOYMENTS).join(', ')}\`);
  }
  
  const deployment = networkDeployments[env];
  if (!deployment) {
    const availableEnvs = Object.keys(networkDeployments).join(', ');
    throw new Error(\`No deployment found for \${network}-\${env}. Available environments for \${network}: \${availableEnvs}\`);
  }
  
  return deployment;
}

/**
 * Get contract addresses for network + environment
 */
export function getContractAddresses(network: NetworkName, env: Environment) {
  return getDeployment(network, env).addresses;
}

/**
 * Get all available networks
 */
export function getAvailableNetworks(): NetworkName[] {
  return Object.keys(DEPLOYMENTS) as NetworkName[];
}

/**
 * Get available environments for a network
 */
export function getAvailableEnvironments(network: NetworkName): Environment[] {
  return Object.keys(DEPLOYMENTS[network] || {}) as Environment[];
}

export { SUPPORTED_CHAINS };
`;

  const indexFile = path.join(configDir, "index.ts");
  fs.writeFileSync(indexFile, indexContent);
  console.log("✅ Updated: index.ts");
}

function generateNestedDeployments(files) {
  // Group files by network
  const networks = {};
  
  files.forEach(file => {
    const [network, env] = file.replace('.ts', '').split('-');
    const exportName = `${network.toUpperCase()}_${env.toUpperCase()}_DEPLOYMENT`;
    
    if (!networks[network]) {
      networks[network] = {};
    }
    networks[network][env] = exportName;
  });
  
  // Generate nested structure
  const networkEntries = Object.entries(networks).map(([network, envs]) => {
    const envEntries = Object.entries(envs).map(([env, exportName]) => {
      return `    ${env}: ${exportName},`;
    }).join('\n');
    
    return `  ${network}: {
${envEntries}
  },`;
  }).join('\n');
  
  return networkEntries;
}

// Execute if run directly
if (require.main === module) {
  extractAddresses();
}

module.exports = extractAddresses; 