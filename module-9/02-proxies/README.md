# Upgradeable Contracts with UUPS Pattern

This project demonstrates how to make contracts upgradeable using OpenZeppelin's UUPS upgradeable pattern. It includes three sets of contracts:

1. **Simple NFT (01-SimpleNFT)**: An upgradeable NFT with god mode in V2
2. **Exchange System (02-Exchange)**: Upgradeable token, NFT, and exchange contracts
3. **Staking System (03-Staking)**: Upgradeable staking platform with rewards

## Project Structure

```
contracts/
├── 01-SimpleNFT/
│   ├── FacesNFT.sol         # Upgradeable NFT contract V1
│   └── FacesNFT_V2.sol      # Upgradeable NFT contract V2 with god mode
├── 02-Exchange/
│   ├── Exchange.sol         # Exchange contract
│   ├── ExchangeToken.sol    # Token used in exchange
│   └── ExchangeNFT.sol      # NFT used in exchange
└── 03-Staking/
    ├── Staking.sol          # Staking contract
    └── StakingToken.sol     # Token used for staking

scripts/
├── 01-nft/                  # Scripts for NFT contracts
│   ├── deploy.js            # Deploy NFT V1
│   └── upgrade.js           # Upgrade to NFT V2
├── 02-exchange/             # Scripts for Exchange contracts
│   └── deploy.js            # Deploy Exchange system
├── 03-staking/              # Scripts for Staking contracts
│   └── deploy.js            # Deploy Staking system
└── utils/                   # Utility scripts
    └── addresses.js         # Contract address tracking utility

test/
├── 01-nft/                  # Tests for NFT contracts
├── 02-exchange/             # Tests for Exchange contracts
└── 03-staking/              # Tests for Staking contracts
```

## Getting Started

### Prerequisites

This project uses Hardhat for development and testing. Make sure you have Node.js installed.

### Installation

```bash
npm install
```

### Compiling Contracts

```bash
npx hardhat compile
```

### Running Tests

To test the deployments and upgrades:

```bash
# First start the Hardhat node in a separate terminal
npx hardhat node

# In another terminal, run these test scripts:

# Test the full NFT deployment and upgrade flow
node scripts/test-nft-flow.js

# Test the Exchange system deployment
node scripts/test-exchange-flow.js

# Test the Staking system deployment
node scripts/test-staking-flow.js

# Run all tests in sequence
node scripts/test-all.js
```

You can also run the Hardhat tests to verify the contracts:
```bash
# Test NFT deployment and upgrade flow
npx hardhat test test/01-nft/FacesNFT.test.js

# Test Exchange system
npx hardhat test test/02-exchange/Exchange.test.js

# Test Staking system
npx hardhat test test/03-staking/Staking.test.js
```

## Deployment Commands

All scripts automatically save deployed addresses to `.addresses.json` for tracking.

### Start Local Hardhat Node

```bash
npx hardhat node
```

### NFT Contracts

```bash
# Deploy the NFT V1
npx hardhat run scripts/01-nft/deploy.js --network localhost

# Upgrade to NFT V2 with god mode
npx hardhat run scripts/01-nft/upgrade.js --network localhost
```

### Exchange Contracts

```bash
# Deploy the Exchange system (token, NFT, and exchange)
npx hardhat run scripts/02-exchange/deploy.js --network localhost
```

### Staking Contracts

```bash
# Deploy the Staking system (token and staking contract)
npx hardhat run scripts/03-staking/deploy.js --network localhost
```

## Address Tracking

The project automatically tracks deployed contract addresses in `.addresses.json`. This file is used by upgrade scripts to find the correct proxy addresses without manual entry.

When running on localhost, the system automatically:
- Uses the first Hardhat account as admin
- Stores proxy and implementation addresses by contract type
- Makes addresses available to upgrade scripts

Example `.addresses.json` structure:
```json
{
  "localhost": {
    "01-nft": {
      "proxy": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "implementation": "0x5FbDB2315678afecb367f032d93F642f64180aa3", 
      "admin": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "implementationV2": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    },
    "02-exchange": {
      "token": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
      "nft": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
      "exchange": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
      "admin": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    },
    "03-staking": {
      "token": "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
      "nft": "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
      "staking": "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
      "admin": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    }
  }
}
```

## How UUPS Upgrades Work

1. Initial deployment creates:
   - Implementation contract (logic)
   - Proxy contract (storage)
   - ProxyAdmin contract (controls upgrades)

2. For upgrades:
   - Deploy new implementation
   - Call `upgradeTo()` on the proxy
   - All state is preserved in the proxy's storage

## NFT God Mode Feature

The NFT V2 adds "god mode" allowing the contract owner to forcefully transfer NFTs between accounts:

```solidity
// Call after upgrading to V2:
function godModeTransfer(address from, address to, uint256 tokenId) external onlyOwner
```

Example usage after upgrading:
```javascript
// Get contract instance
const nft = await ethers.getContractAt("FacesNFT_V2", proxyAddress);
  
// Execute god mode transfer
await nft.godModeTransfer(userAddress, newOwnerAddress, tokenId);
```

## Verification on Etherscan

After deployment, you can verify your contracts on Etherscan:

```bash
npx hardhat verify --network <network> <deployed-contract-address> <constructor-arguments>
```

Etherscan will show both the proxy and implementation contracts, allowing users to see the previous version and the upgraded version with the god mode feature. 