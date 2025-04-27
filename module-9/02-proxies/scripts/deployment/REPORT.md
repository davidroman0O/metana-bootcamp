davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/00-init.js --network sepolia
WARNING: You are currently using Node.js v23.10.0, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions


Initializing fresh deployment state for sepolia network
Chain ID: 11155111
Initialized empty addresses file for sepolia
✅ Initialization complete. Ready for fresh deployments on sepolia.

Next steps:
1. Deploy NFT V1: npx hardhat run scripts/deployment/01-deploy-nft-v1.js --network sepolia
2. After deployment, you can proceed with the upgrade and other steps
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/01-deploy-nft-v1.js --network sepolia
WARNING: You are currently using Node.js v23.10.0, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions


Deploying NFT V1 contract
Network: sepolia
Chain ID: 11155111
Deploying with account: 0x92145c8e548A87DFd716b1FD037a5e476a1f2a86

⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:
  1. Your device is connected via USB
  2. The device is unlocked
  3. The Ethereum app is open
  4. Contract data is allowed in the Ethereum app settings


Deploying FacesNFT V1...
✔ [hardhat-ledger] Connecting wallet
✔ [hardhat-ledger] Waiting for confirmation
FacesNFT V1 deployed to: 0xac7A8f474a30aC464A92dbC0C9Ca5a9082f84f39
Deployment transaction hash: 0x5189d63088787aab9fc5d75cd2157c41c59db7a8272c22d4fa3cf7c5ccc83953
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x5189d63088787aab9fc5d75cd2157c41c59db7a8272c22d4fa3cf7c5ccc83953
View contract on Etherscan: https://sepolia.etherscan.io/address/0xac7A8f474a30aC464A92dbC0C9Ca5a9082f84f39
Implementation V1 address: 0xa74995359704872D0Fb9daEbb49e478bc3F8BC26
Addresses saved for sepolia/nft

V1 Deployment complete!
Use this proxy address for upgrading to V2: 0xac7A8f474a30aC464A92dbC0C9Ca5a9082f84f39
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/02-upgrade-nft-to-v2.js --network sepolia
WARNING: You are currently using Node.js v23.10.0, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions


Upgrading NFT contract from V1 to V2
Network: sepolia
Chain ID: 11155111
Upgrading with account: 0x92145c8e548A87DFd716b1FD037a5e476a1f2a86

⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:
  1. Your device is connected via USB
  2. The device is unlocked
  3. The Ethereum app is open
  4. Contract data is allowed in the Ethereum app settings


Using proxy address: 0xac7A8f474a30aC464A92dbC0C9Ca5a9082f84f39
Original V1 implementation: 0xa74995359704872D0Fb9daEbb49e478bc3F8BC26

Upgrading to FacesNFT V2 with god mode capability...
✔ [hardhat-ledger] Connecting wallet
✔ [hardhat-ledger] Waiting for confirmation
Upgrade transaction completed, but transaction hash not available
View contract on Etherscan: https://sepolia.etherscan.io/address/0xac7A8f474a30aC464A92dbC0C9Ca5a9082f84f39
New V2 implementation address: 0xa74995359704872D0Fb9daEbb49e478bc3F8BC26
Contract has godModeTransfer function: true
✅ V2 functionality verified!
Addresses saved for sepolia/nft

✅ Upgrade from V1 to V2 complete!
Contract now has god mode capability.
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/03-deploy-exchange.js --network sepolia
WARNING: You are currently using Node.js v23.10.0, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions


Deploying Exchange system
Network: sepolia
Chain ID: 11155111
Deploying with account: 0x92145c8e548A87DFd716b1FD037a5e476a1f2a86

⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:
  1. Your device is connected via USB
  2. The device is unlocked
  3. The Ethereum app is open
  4. Contract data is allowed in the Ethereum app settings


Deploying ExchangeVisageToken...
✔ [hardhat-ledger] Connecting wallet
✔ [hardhat-ledger] Waiting for confirmation
ExchangeVisageToken deployed to: 0x907ea2115E239E9AE0CdB847d97F8cdB47e02E44
Implementation address: 0x9f3f250F8a90df801cC93017a327e1DAC76AE990
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0xf510bb01c541aca44c54cfec48d33e17425c638a400cb09712929eadb5dd3db0

Deploying ExchangeVisageNFT...
✔ [hardhat-ledger] Waiting for confirmation
ExchangeVisageNFT deployed to: 0x1e3892B5e996888d3C824F4bcDEE7cE983Dc6B7c
Implementation address: 0x7e596af8F9A0e867084a16b82Fdec9dC07dF9d8B
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x65955f5d90b5509a4d956c2e30557073e72ad9fa72b23cf6ac354db73532ec1e

Deploying VisageExchange...
✔ [hardhat-ledger] Waiting for confirmation
VisageExchange deployed to: 0x588E1F78bBd7383FFE5f981DdF0909b246315B4f
Implementation address: 0xB26aEc377CF85e70aC89bE1edaD8bAa97F9b3DAb
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x35505e8bca168fe176e6de0b41c582a7b4eb7efadf4742d30d87fe28948bda09

Transferring token ownership to exchange...
✔ [hardhat-ledger] Waiting for confirmation
Transferring NFT ownership to exchange...
✔ [hardhat-ledger] Waiting for confirmation
✅ Ownership transferred to exchange
Token ownership transfer: https://sepolia.etherscan.io/tx/0x7035bc16bacd0ac9ab006523b19f02f2f0945c9c395a675bcbfbb600bb9bc7e9
NFT ownership transfer: https://sepolia.etherscan.io/tx/0x685b46515b10a90cc72809c929e3f4aa390490e541fcacb8ed7dabfd40658921
Addresses saved for sepolia/exchange

Contract Etherscan links:
Token: https://sepolia.etherscan.io/address/0x907ea2115E239E9AE0CdB847d97F8cdB47e02E44
NFT: https://sepolia.etherscan.io/address/0x1e3892B5e996888d3C824F4bcDEE7cE983Dc6B7c
Exchange: https://sepolia.etherscan.io/address/0x588E1F78bBd7383FFE5f981DdF0909b246315B4f

Exchange system deployment complete!
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/04-deploy-staking.js --network sepolia
WARNING: You are currently using Node.js v23.10.0, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions


Deploying Staking system
Network: sepolia
Chain ID: 11155111
Deploying with account: 0x92145c8e548A87DFd716b1FD037a5e476a1f2a86

⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:
  1. Your device is connected via USB
  2. The device is unlocked
  3. The Ethereum app is open
  4. Contract data is allowed in the Ethereum app settings


Deploying StakingVisageToken...
✔ [hardhat-ledger] Connecting wallet
✔ [hardhat-ledger] Waiting for confirmation
StakingVisageToken deployed to: 0xcc2f02F2933407BdCBe65b0352A0E6B8525CE225
Implementation address: 0xD9086F6a2ACb789b72Dac140C957BD7a76E726c3
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0xbcf7e0c437137cd26a2d8f73a6a98027c62fd97ad2ebe44eb540357904765080

Deploying StakingVisageNFT...
✔ [hardhat-ledger] Waiting for confirmation
StakingVisageNFT deployed to: 0x6E4B921233DE01Fb1AbAe5F9422f3bD2a48D69a6
Implementation address: 0xC86897A781C1a6f1C2ba801dAbbB43227825776B
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x2c3c2c6107cb8f652989e73a024a51b68a3c5fa3c5e36e768388092d198404d1

Deploying VisageStaking...
✔ [hardhat-ledger] Waiting for confirmation
VisageStaking deployed to: 0x42b6E5ea598Cd7FAeaE5D4c0b2ccD268D0f8c4Ed
Implementation address: 0xC9e108FE04120cC3da6e40e83a12251C2b54A984
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0xcb2c7b4b4e5c4e5d39fdd2d2948411b123ff73f8d5d3ccd84200e8d351dca439

Transferring staking token ownership to staking contract...
✔ [hardhat-ledger] Waiting for confirmation
Transferring staking NFT ownership to staking contract...
✔ [hardhat-ledger] Waiting for confirmation
✅ Ownership transferred to staking contract
Token ownership transfer: https://sepolia.etherscan.io/tx/0xee3b8037510d6a2f10c8f55bef78bb91877a1ee7478c5cec3bba28e91cd49246
NFT ownership transfer: https://sepolia.etherscan.io/tx/0xaa8aae646cfe376e42aae8b88d045d48117cf363df7eed56b613f55545cc78b5
Addresses saved for sepolia/staking

Contract Etherscan links:
Token: https://sepolia.etherscan.io/address/0xcc2f02F2933407BdCBe65b0352A0E6B8525CE225
NFT: https://sepolia.etherscan.io/address/0x6E4B921233DE01Fb1AbAe5F9422f3bD2a48D69a6
Staking: https://sepolia.etherscan.io/address/0x42b6E5ea598Cd7FAeaE5D4c0b2ccD268D0f8c4Ed

Staking system deployment complete!
