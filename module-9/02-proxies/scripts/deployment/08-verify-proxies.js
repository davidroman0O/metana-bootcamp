const { run, network } = require("hardhat");
const { getAddresses } = require("../utils/addresses");
const { withRetry } = require("../utils/retry");
require('dotenv').config();

async function main() {
  // Check if Etherscan API key is set
  if (!process.env.ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY === "YOUR_ETHERSCAN_API_KEY") {
    console.error("\n❌ ERROR: ETHERSCAN_API_KEY environment variable is not set or is default value");
    console.error("Please set your Etherscan API key in the .env file");
    console.error("You can get an API key from https://etherscan.io/myapikey");
    process.exit(1);
  }

  // Skip verification for local networks
  if (network.name === 'localhost' || network.name === 'hardhat') {
    console.log("Skipping verification on local network");
    return;
  }

  console.log(`Starting proxy contract verification on ${network.name}...`);
  console.log("⚠️ Note: All implementation contracts must be verified first!");
  console.log("If the implementation contracts are not verified, run script 07-verify-contracts.js first\n");

  // Get addresses from the deployment files
  const nftAddresses = getAddresses(network.name, "nft") || {};
  const stakingAddresses = getAddresses(network.name, "staking") || {};
  const exchangeAddresses = getAddresses(network.name, "exchange") || {};

  const proxiesToVerify = [];

  // Add NFT proxy
  if (nftAddresses.proxy) {
    proxiesToVerify.push({
      address: nftAddresses.proxy,
      description: "NFT Proxy (FacesNFT)"
    });
  }

  // Add Staking NFT proxy
  if (stakingAddresses.nft) {
    proxiesToVerify.push({
      address: stakingAddresses.nft,
      description: "Staking NFT Proxy (StakingVisageNFT)"
    });
  }

  // Add ERC20 Token proxy
  if (stakingAddresses.token) {
    proxiesToVerify.push({
      address: stakingAddresses.token,
      description: "ERC20 Token Proxy (StakingVisageToken)"
    });
  }

  // Verify each proxy contract
  console.log(`Found ${proxiesToVerify.length} proxy contracts to verify\n`);
  
  for (const proxy of proxiesToVerify) {
    console.log(`Verifying ${proxy.description} at ${proxy.address}...`);
    try {
      // This will attempt to verify the proxy contract with retry
      await withRetry(
        async () => {
          await run("verify:verify", {
            address: proxy.address,
          });
        },
        {
          maxRetries: 3,
          initialDelay: 10000, // Etherscan may need more time
          onRetry: (attempt, error) => {
            console.log(`   ⚠️ Verification attempt ${attempt} failed: ${error.message}`);
            console.log(`   Retrying verification...`);
          }
        }
      );
      
      console.log(`✅ Verification process initiated for ${proxy.description}`);
      console.log("   Note: For proxy verification, you may need to follow additional steps on Etherscan");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${proxy.description} already verified`);
      } else {
        console.error(`❌ Error initiating verification for ${proxy.description}:`, error.message);
      }
    }
  }

  console.log("\n====== VERIFICATION PROCESS INITIATED ======");
  console.log("To complete proxy verification, you'll need to manually click 'Is this a proxy?' on Etherscan for each contract:");
  
  if (nftAddresses.proxy) {
    console.log(`\n1. NFT Proxy: https://${network.name}.etherscan.io/address/${nftAddresses.proxy}#code`);
    console.log("   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'");
  }
  
  if (stakingAddresses.nft) {
    console.log(`\n2. Staking NFT Proxy: https://${network.name}.etherscan.io/address/${stakingAddresses.nft}#code`);
    console.log("   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'");
  }
  
  if (stakingAddresses.token) {
    console.log(`\n3. ERC20 Token Proxy: https://${network.name}.etherscan.io/address/${stakingAddresses.token}#code`);
    console.log("   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'");
  }

  console.log("\nMake sure to verify the implementation contracts first (using script 07-verify-contracts.js)");
  console.log("Then manually click 'Is this a proxy?' for each proxy on Etherscan to complete the verification.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 