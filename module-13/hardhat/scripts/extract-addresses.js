const fs = require("fs");
const path = require("path");

async function extractAddresses() {
  console.log("Extracting contract addresses for frontend...");

  try {
    // Read deployment data
    const deploymentDir = path.join(__dirname, "../deployments");
    const hardhatDeploymentFile = path.join(deploymentDir, "deployment-31337.json");
    
    if (!fs.existsSync(hardhatDeploymentFile)) {
      console.error("Deployment file not found:", hardhatDeploymentFile);
      console.error("Please run deployment first: npm run deploy:fork");
      process.exit(1);
    }

    const deploymentData = JSON.parse(fs.readFileSync(hardhatDeploymentFile, "utf8"));
    console.log("Read deployment data for network:", deploymentData.network.chainId);

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

    // Create address files for frontend
    const addressesContent = `// Auto-generated contract addresses from deployment
// Generated at: ${deploymentData.network.timestamp}
// Network: ${deploymentData.network.name} (${deploymentData.network.chainId})

export interface ContractAddresses {
  DEGEN_SLOTS: \`0x\${string}\`;
  CHIP_TOKEN: \`0x\${string}\`;
}

export const LOCAL_CONTRACT_ADDRESSES: ContractAddresses = {
  DEGEN_SLOTS: "${degenSlotsAddress}",
  CHIP_TOKEN: "${chipTokenAddress}",
};

export interface DeploymentInfo {
  network: string;
  chainId: number;
  timestamp: string;
  deployer: \`0x\${string}\`;
  blockNumber: number;
  initialFunding: string;
  ${deploymentData.exchangeRates ? `exchangeRates?: {
    ethPriceUSDCents: string;
    chipsPerETH: string;
    targetChipPriceUSD: string;
  };` : ''}
}

export const DEPLOYMENT_INFO: DeploymentInfo = {
  network: "${deploymentData.network.name}",
  chainId: ${deploymentData.network.chainId},
  timestamp: "${deploymentData.network.timestamp}",
  deployer: "${deploymentData.deployer}",
  blockNumber: ${deploymentData.blockNumber},
  initialFunding: "${deploymentData.initialFunding}",
  ${deploymentData.exchangeRates ? `exchangeRates: {
    ethPriceUSDCents: "${deploymentData.exchangeRates.ethPriceUSDCents}",
    chipsPerETH: "${deploymentData.exchangeRates.chipsPerETH}",
    targetChipPriceUSD: "${deploymentData.exchangeRates.targetChipPriceUSD}"
  },` : ''}
};
`;

    const addressesFile = path.join(frontendConfigDir, "local.ts");
    fs.writeFileSync(addressesFile, addressesContent);
    console.log("✅ Address file created:", addressesFile);

    // Extract and save ABIs
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
      
      const abiFile = path.join(frontendConfigDir, "DegenSlotsABI.ts");
      fs.writeFileSync(abiFile, abiContent);
      console.log("✅ DegenSlots ABI file created:", abiFile);
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
      
      const abiFile = path.join(frontendConfigDir, "ChipTokenABI.ts");
      fs.writeFileSync(abiFile, abiContent);
      console.log("✅ ChipToken ABI file created:", abiFile);
    }

    // Update the main wagmi config to import local addresses
    const wagmiConfigPath = path.join(__dirname, "../../frontend/src/config/wagmi.js");
    if (fs.existsSync(wagmiConfigPath)) {
      let wagmiConfig = fs.readFileSync(wagmiConfigPath, "utf8");
      
      // Add import for local addresses at the top
      const importStatement = `import { LOCAL_CONTRACT_ADDRESSES } from './contracts/local.ts';\n`;
      
      if (!wagmiConfig.includes("LOCAL_CONTRACT_ADDRESSES")) {
        wagmiConfig = importStatement + wagmiConfig;
        
        // Update the hardhat local addresses
        wagmiConfig = wagmiConfig.replace(
          /\[hardhatLocal\.id\]: \{[\s\S]*?\},/,
          `[hardhatLocal.id]: {
    DEGEN_SLOTS: LOCAL_CONTRACT_ADDRESSES.DEGEN_SLOTS,
    CHIP_TOKEN: LOCAL_CONTRACT_ADDRESSES.CHIP_TOKEN,
  },`
        );
        
        fs.writeFileSync(wagmiConfigPath, wagmiConfig);
        console.log("✅ Updated wagmi config with local addresses");
      }
    }

    // Create a summary file
    const summaryContent = `# Deployment Summary

**Network:** ${deploymentData.network.name} (${deploymentData.network.chainId})
**Deployed at:** ${deploymentData.network.timestamp}
**Deployer:** ${deploymentData.deployer}
**Block Number:** ${deploymentData.blockNumber}

## Contract Addresses

- **DegenSlots:** \`${degenSlotsAddress}\`
- **ChipToken:** \`${chipTokenAddress}\`

## Usage

To use these contracts in your frontend:

\`\`\`javascript
import { LOCAL_CONTRACT_ADDRESSES } from './config/contracts/local.ts';

const degenSlotsAddress = LOCAL_CONTRACT_ADDRESSES.DEGEN_SLOTS;
const chipTokenAddress = LOCAL_CONTRACT_ADDRESSES.CHIP_TOKEN;
\`\`\`

${deploymentData.exchangeRates ? `## Exchange Rates

- **ETH Price:** $${(parseInt(deploymentData.exchangeRates.ethPriceUSDCents) / 100).toFixed(2)}
- **CHIPS per ETH:** ${deploymentData.exchangeRates.chipsPerETH}
- **Target CHIP Price:** $${deploymentData.exchangeRates.targetChipPriceUSD}` : ''}

## Initial Setup

The contract has been funded with ${deploymentData.initialFunding} ETH for initial liquidity.
`;

    const summaryFile = path.join(frontendConfigDir, "README.md");
    fs.writeFileSync(summaryFile, summaryContent);
    console.log("✅ Deployment summary created:", summaryFile);

    console.log("\n🎉 Contract addresses successfully extracted to frontend!");
    console.log("📁 Files created in:", frontendConfigDir);
    console.log("   - local.ts (addresses and deployment info)");
    console.log("   - DegenSlotsABI.ts (contract ABI)");
    console.log("   - ChipTokenABI.ts (contract ABI)");
    console.log("   - README.md (deployment summary)");
    console.log("\n🔧 Updated wagmi.js config with local addresses");

  } catch (error) {
    console.error("❌ Failed to extract addresses:", error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  extractAddresses();
}

module.exports = extractAddresses; 