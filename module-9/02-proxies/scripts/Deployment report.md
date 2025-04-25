Deployment report

```
% npx hardhat run scripts/deploy-with-ledger.js --network sepolia
WARNING: You are currently using Node.js v23.10.0, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions


Deploying all contracts to Sepolia using Ledger wallet
Network: sepolia
Deploying with the Ledger account: 0x92145c8e548A87DFd716b1FD037a5e476a1f2a86

⚠️ IMPORTANT: Please ensure your Ledger device is:
  1. Connected via USB
  2. Unlocked
  3. Ethereum app is open
  4. Contract data is allowed in the Ethereum app settings


1. Deploying FacesNFT...
  Waiting for deployment transaction signature on Ledger...
✔ [hardhat-ledger] Connecting wallet
✔ [hardhat-ledger] Waiting for confirmation
  ✅ FacesNFT deployed to: 0xCC8A28e20AED59c169a2470c16e209D8B0f06e1a
  Implementation address: 0xc7996ba630e8a2Bbae608a72858E345BeA9332F5
Addresses saved for sepolia/01-nft

2. Deploying Exchange system...
  Deploying ExchangeVisageToken...
  Waiting for token deployment transaction signature on Ledger...
✔ [hardhat-ledger] Waiting for confirmation
  ✅ ExchangeVisageToken deployed to: 0x5144530C638b6624b9527A1c59c685de8E4F82f0
  Deploying ExchangeVisageNFT...
  Waiting for NFT deployment transaction signature on Ledger...
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
  ✅ ExchangeVisageNFT deployed to: 0x37171C38cFc8C6DdE76f32B1f222aa53b91Ab66d
  Deploying VisageExchange...
  Waiting for exchange deployment transaction signature on Ledger...
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
  ✅ VisageExchange deployed to: 0x62e9B7fBBb2907Dd897a4B008c22a9DA6650AD17
  Transferring token ownership to exchange...
✔ [hardhat-ledger] Waiting for confirmation
  Transferring NFT ownership to exchange...
✔ [hardhat-ledger] Waiting for confirmation
  ✅ Ownership transferred to exchange
Addresses saved for sepolia/02-exchange

3. Deploying Staking system...
  Deploying StakingVisageToken...
  Waiting for staking token deployment transaction signature on Ledger...
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
  ✅ StakingVisageToken deployed to: 0xCFf4D9fE1497a80845b1886fa0cd7cdeA1dF0EE8
  Deploying StakingVisageNFT...
  Waiting for staking NFT deployment transaction signature on Ledger...
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
  ✅ StakingVisageNFT deployed to: 0xe9D0Eb06aF1C6480f76629E418Bbd4d7999867D3
  Deploying VisageStaking...
  Waiting for staking contract deployment transaction signature on Ledger...
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
  ✅ VisageStaking deployed to: 0x2DF5D61707Fdca036a0c380648C751Ec983c634E
  Transferring staking token ownership to staking contract...
✔ [hardhat-ledger] Waiting for confirmation
  Transferring staking NFT ownership to staking contract...
✔ [hardhat-ledger] Waiting for confirmation
  ✅ Ownership transferred to staking contract
Addresses saved for sepolia/03-staking

🎉 All contracts deployed to Sepolia successfully!
Check the .addresses.json file for all contract addresses.
```

Upgrades

```
% npx hardhat run scripts/upgrade-nft-with-ledger.js --network sepolia
WARNING: You are currently using Node.js v23.10.0, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions


Upgrading NFT contract using Ledger wallet
Network: sepolia
Upgrading with the Ledger account: 0x92145c8e548A87DFd716b1FD037a5e476a1f2a86

⚠️ IMPORTANT: Please ensure your Ledger device is:
  1. Connected via USB
  2. Unlocked
  3. Ethereum app is open
  4. Contract data is allowed in the Ethereum app settings

Using existing proxy address: 0xCC8A28e20AED59c169a2470c16e209D8B0f06e1a
Preparing upgrade to FacesNFT V2 with god mode capability...
Waiting for upgrade transaction signature on Ledger...
✔ [hardhat-ledger] Connecting wallet
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
Addresses saved for sepolia/01-nft
✅ Upgrade complete! Contract now has god mode capability.
New implementation address: 0xc7996ba630e8a2Bbae608a72858E345BeA9332F5
Addresses saved to .addresses.json
```

My .addresses.json 

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
  },
  "sepolia": {
    "01-nft": {
      "proxy": "0xCC8A28e20AED59c169a2470c16e209D8B0f06e1a",
      "implementation": "0xc7996ba630e8a2Bbae608a72858E345BeA9332F5",
      "admin": "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86",
      "implementationV2": "0xc7996ba630e8a2Bbae608a72858E345BeA9332F5"
    },
    "02-exchange": {
      "token": "0x5144530C638b6624b9527A1c59c685de8E4F82f0",
      "nft": "0x37171C38cFc8C6DdE76f32B1f222aa53b91Ab66d",
      "exchange": "0x62e9B7fBBb2907Dd897a4B008c22a9DA6650AD17",
      "admin": "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86"
    },
    "03-staking": {
      "token": "0xCFf4D9fE1497a80845b1886fa0cd7cdeA1dF0EE8",
      "nft": "0xe9D0Eb06aF1C6480f76629E418Bbd4d7999867D3",
      "staking": "0x2DF5D61707Fdca036a0c380648C751Ec983c634E",
      "admin": "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86"
    }
  }
}
```
