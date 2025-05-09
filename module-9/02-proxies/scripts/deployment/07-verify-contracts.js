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

  console.log(`Starting contract verification on ${network.name}...`);

  // Get addresses from the deployment files
  const nftAddresses = getAddresses(network.name, "nft") || {};
  const exchangeAddresses = getAddresses(network.name, "exchange") || {};
  const stakingAddresses = getAddresses(network.name, "staking") || {};

  const implementationsToVerify = [];

  // Add NFT implementations
  if (nftAddresses.implementationV1) {
    implementationsToVerify.push({
      address: nftAddresses.implementationV1,
      contract: "contracts/01-SimpleNFT.sol:FacesNFT",
      description: "NFT V1 Implementation"
    });
  }

  if (nftAddresses.implementationV2 && nftAddresses.implementationV2 !== nftAddresses.implementationV1) {
    implementationsToVerify.push({
      address: nftAddresses.implementationV2,
      contract: "contracts/01-SimpleNFT_V2.sol:FacesNFT",
      description: "NFT V2 Implementation"
    });
  }

  // Add Exchange implementations
  if (stakingAddresses.tokenImpl) {
    implementationsToVerify.push({
      address: stakingAddresses.tokenImpl,
      contract: "contracts/03-Staking.sol:StakingVisageToken",
      description: "Staking Token Implementation"
    });
  }

  if (stakingAddresses.nftImpl) {
    implementationsToVerify.push({
      address: stakingAddresses.nftImpl,
      contract: "contracts/03-Staking.sol:StakingVisageNFT",
      description: "Staking NFT Implementation"
    });
  }

  if (stakingAddresses.stakingImpl) {
    implementationsToVerify.push({
      address: stakingAddresses.stakingImpl,
      contract: "contracts/03-Staking.sol:VisageStaking",
      description: "Staking System Implementation"
    });
  }

  if (exchangeAddresses.tokenImpl) {
    implementationsToVerify.push({
      address: exchangeAddresses.tokenImpl,
      contract: "contracts/02-Exchange.sol:ExchangeVisageToken",
      description: "Exchange Token Implementation"
    });
  }

  if (exchangeAddresses.nftImpl) {
    implementationsToVerify.push({
      address: exchangeAddresses.nftImpl,
      contract: "contracts/02-Exchange.sol:ExchangeVisageNFT",
      description: "Exchange NFT Implementation"
    });
  }

  if (exchangeAddresses.exchangeImpl) {
    implementationsToVerify.push({
      address: exchangeAddresses.exchangeImpl,
      contract: "contracts/02-Exchange.sol:VisageExchange",
      description: "Exchange System Implementation"
    });
  }

  // Verify each implementation contract
  console.log(`Found ${implementationsToVerify.length} implementation contracts to verify`);
  
  for (const impl of implementationsToVerify) {
    console.log(`\nVerifying ${impl.description} at ${impl.address}...`);
    try {
      // Use retry logic for verification
      await withRetry(
        async () => {
          await run("verify:verify", {
            address: impl.address,
            contract: impl.contract
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
      
      console.log(`✅ ${impl.description} verified successfully`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${impl.description} already verified`);
      } else {
        console.error(`❌ Error verifying ${impl.description}:`, error.message);
      }
    }
  }

  console.log("\n====== VERIFICATION COMPLETE ======");
  console.log("After all implementations are verified, you can now manually verify the proxy contracts on Etherscan:");
  
  if (nftAddresses.proxy) {
    console.log(`\n1. NFT Proxy: ${nftAddresses.proxy}`);
    console.log(`   Implementation: ${nftAddresses.implementationV2 || nftAddresses.implementationV1}`);
    console.log(`   Etherscan URL: https://${network.name}.etherscan.io/address/${nftAddresses.proxy}#code`);
    console.log("   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'");
  }
  
  if (stakingAddresses.nft) {
    console.log(`\n2. Staking NFT Proxy: ${stakingAddresses.nft}`);
    console.log(`   Implementation: ${stakingAddresses.nftImpl}`);
    console.log(`   Etherscan URL: https://${network.name}.etherscan.io/address/${stakingAddresses.nft}#code`);
    console.log("   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'");
  }
  
  if (stakingAddresses.token) {
    console.log(`\n3. ERC20 Token Proxy: ${stakingAddresses.token}`);
    console.log(`   Implementation: ${stakingAddresses.tokenImpl}`);
    console.log(`   Etherscan URL: https://${network.name}.etherscan.io/address/${stakingAddresses.token}#code`);
    console.log("   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 