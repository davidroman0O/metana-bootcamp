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

    // Determine which deployment files to process
    const deploymentDir = path.join(__dirname, "../deployments");
    const deploymentFiles = [
      { file: "deployment-31337.json", network: "hardhat" },
      { file: "deployment-11155111.json", network: "sepolia" }
    ];

    // Filter to only existing deployment files
    const existingDeployments = deploymentFiles.filter(({ file }) => 
      fs.existsSync(path.join(deploymentDir, file))
    );

    if (existingDeployments.length === 0) {
      console.error("❌ No deployment files found in:", deploymentDir);
      console.error("Available files should be: deployment-31337.json, deployment-11155111.json");
      process.exit(1);
    }

    console.log(`📊 Found ${existingDeployments.length} deployment(s):`, 
      existingDeployments.map(d => d.network).join(", "));

    // Process each deployment file
    const processedDeployments = [];
    for (const { file, network } of existingDeployments) {
      console.log(`\n🔄 Processing ${network} deployment...`);
      
      const deploymentPath = path.join(deploymentDir, file);
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      
      processedDeployments.push({ network, deploymentData });
      await processDeployment(deploymentData, network);
    }

    // Frontend config directory
    const frontendConfigDir = path.join(__dirname, "../../frontend/src/config/contracts");
    if (!fs.existsSync(frontendConfigDir)) {
      fs.mkdirSync(frontendConfigDir, { recursive: true });
    }

    // Generate types file (only once)
    await generateTypesFile(frontendConfigDir);

    // Generate or update ABIs (only once, using first deployment)
    await generateABIs(frontendConfigDir, processedDeployments[0].deploymentData);

    // Update index file after all networks are processed
    await updateIndexFile(frontendConfigDir);

    console.log("\n🎉 Contract addresses successfully extracted for all networks!");
    console.log(`📁 Generated files for networks: ${processedDeployments.map(d => d.network).join(", ")}`);

  } catch (error) {
    console.error("❌ Failed to extract addresses:", error);
    process.exit(1);
  }
}

async function processDeployment(deploymentData, networkName) {
  // Extract contract addresses (handle both CasinoSlot and CasinoSlotTest)
  let casinoSlotAddress;
  if (deploymentData.contracts.CasinoSlot) {
    casinoSlotAddress = deploymentData.contracts.CasinoSlot.address;
  } else if (deploymentData.contracts.CasinoSlotTest) {
    casinoSlotAddress = deploymentData.contracts.CasinoSlotTest.address;
  } else {
    throw new Error("No CasinoSlot or CasinoSlotTest contract found in deployment");
  }
  console.log(`   CasinoSlot address: ${casinoSlotAddress}`);

  // Frontend config directory
  const frontendConfigDir = path.join(__dirname, "../../frontend/src/config/contracts");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }

  // Determine environment
  const environment = mapEnvironment(process.env.NODE_ENV || 'dev');
  
  console.log(`   🌐 Network: ${networkName}, Environment: ${environment}`);

  // Generate network + environment specific file
  await generateNetworkEnvFile(frontendConfigDir, networkName, environment, {
    casinoSlotAddress,
    deploymentData
  });
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

async function generateNetworkEnvFile(configDir, network, env, { casinoSlotAddress, deploymentData }) {
  const filename = `${network}-${env}.ts`;
  const exportName = `${network.toUpperCase()}_${env.toUpperCase()}_DEPLOYMENT`;
  
  const chainlinkAddresses = getChainlinkAddresses(deploymentData.network.chainId);
  const subgraphConfig = getSubgraphConfig(network);
  
  const content = `// ${network.charAt(0).toUpperCase() + network.slice(1)} ${env.charAt(0).toUpperCase() + env.slice(1)} Environment
// Auto-generated at: ${deploymentData.network.timestamp}
import type { NetworkDeployment } from './types';

export const ${exportName}: NetworkDeployment = {
  addresses: {
    CASINO_SLOT: "${casinoSlotAddress}",${chainlinkAddresses ? `
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
    },` : ''}${subgraphConfig && subgraphConfig.url ? `
    subgraphUrl: "${subgraphConfig.url}",` : ''}${subgraphConfig && subgraphConfig.apiKey ? `
    subgraphApiKey: "${subgraphConfig.apiKey}",` : ''}
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
  CASINO_SLOT: \`0x\${string}\`;
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
  subgraphUrl?: string;
  subgraphApiKey?: string;
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
      vrfCoordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909", // VRF v2
      ethUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
    },
    11155111: { // Sepolia
      vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B", // VRF v2.5
      ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306"
    },
    31337: null // Hardhat - uses mocks
  };
  
  return addresses[chainId];
}

function getSubgraphConfig(network) {
  // Map network to subgraph configurations
  const subgraphConfigs = {
    sepolia: {
      url: 'https://gateway.thegraph.com/api/subgraphs/id/Ajiy1KjRsfNpKQ6cwwtdZdDvd1gY1PCrRKFoYhkRbJ2d',
      apiKey: '6f40bf1cf75c83a954bbd11d9801f1bf'
    },
    hardhat: {
      url: 'http://localhost:8000/subgraphs/name/casino-slot-subgraph',
      apiKey: null // No API key needed for local
    },
    mainnet: null // Not deployed yet
  };
  
  return subgraphConfigs[network];
}

async function generateABIs(configDir, deploymentData) {
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  
  // CasinoSlot ABI (now includes ERC20 functionality)
  const casinoSlotArtifact = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "CasinoSlot.sol/CasinoSlot.json"), "utf8")
  );
  
  const casinoSlotABI = `// Auto-generated CasinoSlot ABI
export const CasinoSlotABI = ${JSON.stringify(casinoSlotArtifact.abi, null, 2)} as const;
`;
  
  fs.writeFileSync(path.join(configDir, "CasinoSlotABI.ts"), casinoSlotABI);
  console.log("✅ Generated: CasinoSlotABI.ts");
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
export * from './CasinoSlotABI';

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