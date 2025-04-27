# Etherscan Verification Guide

This guide will help you verify your deployed contracts on Etherscan so that they can be properly recognized as proxies, enabling full interaction with their functions through the Etherscan interface.

## Prerequisites

1. Make sure you have an Etherscan API key. You can get one by creating an account on [Etherscan](https://etherscan.io) and generating an API key in your account settings.

2. Update your `.env` file with your Etherscan API key:
   ```
   ETHERSCAN_API_KEY=your_api_key_here
   ```

## Verification Process

### Step 1: Verify Implementation Contracts

First, we need to verify the implementation contracts. These are the actual logic contracts that your proxies point to.

```bash
# Run the verification script for implementations
npm run verify-impl

# Or run it directly with hardhat
npx hardhat run scripts/deployment/07-verify-contracts.js --network sepolia
```

This script will:
1. Fetch all implementation addresses from your `.addresses.sepolia.json` file
2. Submit each implementation contract for verification on Etherscan
3. Report the status of each verification attempt

**Important**: Make sure all implementation contracts are successfully verified before proceeding to the next step.

### Step 2: Verify Proxy Contracts

After all implementation contracts are verified, you can verify the proxy contracts:

```bash
# Run the verification script for proxies
npm run verify-proxies

# Or run it directly with hardhat
npx hardhat run scripts/deployment/08-verify-proxies.js --network sepolia
```

This script will:
1. Fetch all proxy addresses from your `.addresses.sepolia.json` file
2. Submit each proxy for initial verification on Etherscan
3. Provide instructions for completing the proxy verification process

### Step 3: Manual Steps on Etherscan

After running the proxy verification script, you'll need to manually complete the process on Etherscan:

1. Visit each proxy contract address on Etherscan
2. Click on "More Options" near the top of the page
3. Select "Is this a proxy?" from the dropdown
4. Click "Verify" on the popup dialog
5. If the implementation contract is properly verified, Etherscan will recognize the proxy and link it to the implementation

### Step 4: Generate a Final Report

After all verifications are complete, generate a report to get all the information needed for your submission:

```bash
# Generate a deployment report
npm run generate-report

# Or run it directly with hardhat
npx hardhat run scripts/deployment/05-verify-and-report.js --network sepolia
```

This will create a comprehensive report with all the contract addresses and verification status.
