# Deployment Scripts

This directory contains the scripts for deploying and upgrading the contract system.

## Overview

The project involves three main systems:

1. **NFT System** - An upgradeable NFT contract that is upgraded from V1 to V2
2. **Exchange System** - Token, NFT, and Exchange contracts working together
3. **Staking System** - Token, NFT, and Staking contracts working together

## Script Naming Convention

- `00-XX` - Initialization scripts
- `01-XX` - NFT system scripts
- `02-XX` - NFT upgrade scripts
- `03-XX` - Exchange system scripts
- `04-XX` - Staking system scripts
- `05-XX` - Verification scripts
- `06-XX` - Testing scripts
- `07-XX` - Etherscan implementation verification scripts
- `08-XX` - Etherscan proxy verification scripts

## Improved Deployment Workflow

The deployment scripts now use network-specific address files (`.addresses.{network}.json`) to store deployed contract addresses. This helps separate different deployment environments and prevents confusion between Sepolia and localhost deployments.

### Starting Fresh

For a fresh deployment on any network, always start with the initialization script:

```
npx hardhat run scripts/deployment/00-init.js --network <network>
```

This will:
1. Create a backup of any existing deployment data for that network
2. Initialize a fresh address file specific to the network
3. Prepare for new deployments

## Deployment Process

### For Local Testing

1. Start a local Hardhat node:
   ```
   npx hardhat node
   ```

2. Initialize a fresh deployment state:
   ```
   npx hardhat run scripts/deployment/00-init.js --network localhost
   ```

3. Deploy the NFT V1 contract:
   ```
   npx hardhat run scripts/deployment/01-deploy-nft-v1.js --network localhost
   ```

4. Upgrade the NFT to V2:
   ```
   npx hardhat run scripts/deployment/02-upgrade-nft-to-v2.js --network localhost
   ```

5. Deploy Exchange system:
   ```
   npx hardhat run scripts/deployment/03-deploy-exchange.js --network localhost
   ```

6. Deploy Staking system:
   ```
   npx hardhat run scripts/deployment/04-deploy-staking.js --network localhost
   ```

7. Verify and generate a report:
   ```
   npx hardhat run scripts/deployment/05-verify-and-report.js --network localhost
   ```

8. Test basic functionality:
   ```
   npx hardhat run scripts/deployment/06-test-basic-functionality.js --network localhost
   ```

### For Sepolia Deployment with Ledger

The same scripts work for Sepolia deployments with Ledger wallets! The scripts automatically detect when a real network is being used and display helpful Ledger-specific instructions.

1. Make sure you have Sepolia ETH in your Ledger account and have configured your `.env` file.

2. Initialize a fresh deployment state:
   ```
   npx hardhat run scripts/deployment/00-init.js --network sepolia
   ```

3. Deploy the NFT V1 contract (1 transaction):
   ```
   npx hardhat run scripts/deployment/01-deploy-nft-v1.js --network sepolia
   ```

4. Upgrade the NFT to V2 (1 transaction):
   ```
   npx hardhat run scripts/deployment/02-upgrade-nft-to-v2.js --network sepolia
   ```

5. Deploy the Exchange system (3 transactions in a single script):
   ```
   npx hardhat run scripts/deployment/03-deploy-exchange.js --network sepolia
   ```

6. Deploy the Staking system (3 transactions in a single script):
   ```
   npx hardhat run scripts/deployment/04-deploy-staking.js --network sepolia
   ```

7. Verify and generate a report:
   ```
   npx hardhat run scripts/deployment/05-verify-and-report.js --network sepolia
   ```

8. Test basic functionality:
   ```
   npx hardhat run scripts/deployment/06-test-basic-functionality.js --network sepolia
   ```

## Etherscan Verification

To verify your contracts on Etherscan, follow these steps:

1. Make sure you have an Etherscan API key and add it to your `.env` file:
   ```
   ETHERSCAN_API_KEY=your_api_key_here
   ```

2. First, verify all implementation contracts:
   ```
   npx hardhat run scripts/deployment/07-verify-contracts.js --network sepolia
   ```

3. Then initiate proxy verification:
   ```
   npx hardhat run scripts/deployment/08-verify-proxies.js --network sepolia
   ```

4. Follow the instructions in the script output to complete proxy verification on Etherscan:
   - Go to the proxy contract address on Etherscan
   - Click on "More Options" > "Is this a proxy?" > "Verify"
   - If the implementation is properly verified, Etherscan will recognize it
   - You'll now be able to read and interact with the proxy's functions correctly

### Troubleshooting Verification

If you encounter issues with proxy verification on Etherscan:

1. Make sure ALL implementation contracts are properly verified first (using script 07)
2. Check that you're using the correct contract names/paths in the verification script
3. Ensure your Etherscan API key is correct and has not exceeded rate limits
4. For manual verification, visit the proxy address on Etherscan and use the "Is this a proxy?" option
5. If a proxy verification fails, try again later as Etherscan may have processing delays

## Hardware Wallet Support

When using a Ledger or other hardware wallet with the `--network sepolia` flag, the scripts will:

1. Automatically show instructions for ensuring your Ledger is ready
2. Prompt you when to confirm transactions on your device
3. Display transaction hashes and Etherscan links for tracking
4. Wait for transaction confirmations before proceeding
5. Provide helpful error messages if your device is locked or disconnected

## Transaction Visibility

All deployment scripts include:

1. Transaction hash printing
2. Etherscan links for each transaction (on Sepolia and other public networks)
3. Contract URLs for deployed contracts
4. Clear prompts for when to sign on the Ledger device

## Verification and Functionality Testing

To ensure proper deployment:

1. The verification script (`05-verify-and-report.js`) generates clean network-specific links:
   - Sepolia: `https://sepolia.etherscan.io/address/...`
   - Localhost: Clean format with `0x123... (local)`

2. The functionality test script (`06-test-basic-functionality.js`) tests:
   - NFT minting and god mode transfers (V2 feature)
   - Exchange token purchases and NFT minting
   - Staking token minting and NFT minting
   - Uses fully qualified contract names to prevent "UnrecognizedContract" issues
   - Includes Etherscan links for all transactions on public networks
   - Displays clear Ledger prompts when using a hardware wallet

## Important Notes

- Always check the `.addresses.{network}.json` file for the deployed addresses for your specific network.
- Use `00-init.js` when you want to start a fresh deployment from scratch.
- The V1->V2 upgrade should show different implementation addresses in the report.
- On Sepolia, you'll need to confirm each transaction on your Ledger device.
- Deployment to Sepolia requires significant gas, ensure you have enough Sepolia ETH.

## Advanced Usage

- You can run `05-verify-and-report.js` at any time to get the current state of the deployments.
- The report generates proper Etherscan links for Sepolia and cleaner notation for local addresses.
- The test script uses proper contract references to avoid "UnrecognizedContract" issues.
- Run the functionality tests to verify that deployed contracts work as expected.
- All scripts automatically detect when they're running on a real network and provide hardware wallet instructions. 