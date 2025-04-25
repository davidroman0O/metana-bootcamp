# Ledger Deployment Guide

## Prerequisites

- Ledger hardware wallet with Ethereum app installed
- Sepolia ETH in your Ledger wallet

## Setup

1. Edit the `.env` file in the project root:
   ```
   LEDGER_ACCOUNT=YOUR_LEDGER_ETHEREUM_ADDRESS
   ALCHEMY_API_URL=SEPOLIA_URL
   ```

2. Connect your Ledger and prepare:
   - Connect via USB
   - Unlock with PIN
   - Open Ethereum app
   - Enable Contract data in Ethereum app settings

## Deployment

1. Deploy all contracts:
   ```
   npx hardhat run scripts/deploy-with-ledger.js --network sepolia
   ```

2. Upgrade the NFT contract to V2 (with god mode):
   ```
   npx hardhat run scripts/upgrade-nft-with-ledger.js --network sepolia
   ```

3. For each transaction:
   - Confirm on your Ledger device when prompted
   - Check transaction details on your Ledger screen
   - Press both buttons to approve

## Verifying Contracts

Verify implementation contracts on Etherscan:
```
npx hardhat verify --network sepolia <implementation-address>
```

## Tips

- Ensure you have enough Sepolia ETH for all transactions (and it cost quite much), I used https://sepolia-faucet.pk910.de/ to get some Sepolia ETH you just have to be patient
- Always verify transaction details on your Ledger screen before confirming 

