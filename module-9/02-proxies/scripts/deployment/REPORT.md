davidroman@MacBookPro 02-proxies % rm -rf artifacts cache typechain-types .openzeppelin/sepolia.json .addresses.sepolia.json                       rm -rf artifacts cache typechain-types .openzeppelin/sepolia.json .addresses.sepolia.json
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/00-init.js --network sepolia
Compiled 27 Solidity files successfully (evm target: paris).
Initializing fresh deployment state for sepolia network
Chain ID: 11155111
Initialized empty addresses file for sepolia
✅ Initialization complete. Ready for fresh deployments on sepolia.

Next steps:
1. Deploy NFT V1: npx hardhat run scripts/deployment/01-deploy-nft-v1.js --network sepolia
2. After deployment, you can proceed with the upgrade and other steps
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/01-deploy-nft-v1.js --network sepolia
Generating typings for: 31 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 100 typings!
Compiled 27 Solidity files successfully (evm target: paris).
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

⚠️ Attempt 1/3 failed: Connect Timeout Error
   Retrying in 5 seconds...
Retry 1: Attempting to deploy proxy again...

⚠️ Attempt 2/3 failed: Connect Timeout Error
   Retrying in 10 seconds...
Retry 2: Attempting to deploy proxy again...
✔ [hardhat-ledger] Waiting for confirmation
FacesNFT V1 deployed to: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
Deployment transaction hash: 0x3762d4a499e21cefa347b9f5524918408c2797faae5797f6e5af81a234938c52
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x3762d4a499e21cefa347b9f5524918408c2797faae5797f6e5af81a234938c52
View contract on Etherscan: https://sepolia.etherscan.io/address/0xdfb63E4641678C08C9301692e1D120AD332eAD94
Implementation V1 address: 0xA141C58f8289c47c0D55737357885D8eA60934d4
Addresses saved for sepolia/nft

==== VERIFYING CONTRACT FUNCTIONALITY ====
Connecting to deployed contract...

Testing version() function...
Version: v1
✅ Contract correctly returns version v1

Testing mint function...
⚠️ Skipping mint test on production network to avoid costs

==== END VERIFICATION ====

V1 Deployment complete!
Use this proxy address for upgrading to V2: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/02-upgrade-nft-to-v2.js --network sepolia
Generating typings for: 31 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 100 typings!
Compiled 27 Solidity files successfully (evm target: paris).
Upgrading NFT contract from V1 to V2
Network: sepolia
Chain ID: 11155111
Upgrading with account: 0x92145c8e548A87DFd716b1FD037a5e476a1f2a86

⚠️ IMPORTANT: If using a Ledger or other hardware wallet, please ensure:
  1. Your device is connected via USB
  2. The device is unlocked
  3. The Ethereum app is open
  4. Contract data is allowed in the Ethereum app settings


Using proxy address: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
Original V1 implementation: 0xA141C58f8289c47c0D55737357885D8eA60934d4

==== COMPARING CONTRACT BYTECODE ====

Getting contract factories for both versions...
V1 bytecode length: 18684 characters
V2 bytecode length: 19208 characters

✅ V1 and V2 have DIFFERENT bytecode.
Bytecode differs by approximately 84.24%
OpenZeppelin Upgrades should deploy a new implementation contract.

==== END BYTECODE COMPARISON ====


Upgrading to FacesNFT V2 with god mode capability...

Deploying V2 implementation contract (if necessary)...
✔ [hardhat-ledger] Connecting wallet
✔ [hardhat-ledger] Waiting for confirmation
✅ V2 implementation deployed/fetched: 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B

Attempting to manually call upgradeTo on proxy (0xdfb63E4641678C08C9301692e1D120AD332eAD94) with new implementation (0x2301736ab6Aa37C32AF02C669991F9421D15DA4B)...
Sending upgradeTo(0x2301736ab6Aa37C32AF02C669991F9421D15DA4B) transaction...
✔ [hardhat-ledger] Waiting for confirmation
Upgrade transaction sent, hash: 0x19d958ed3f13b0a3d0d2bc21a4657b73d41f4e325dbf00ff60a0be98d8e02659
Waiting for transaction confirmation...
✅ Manual upgradeTo transaction confirmed.
Waiting a few seconds for the upgrade transaction to be mined and state to update...
Verifying implementation address after upgrade...
Implementation address after upgrade transaction: 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B
✅ Proxy implementation address successfully updated to V2 address.
Manual upgrade transaction hash: 0x19d958ed3f13b0a3d0d2bc21a4657b73d41f4e325dbf00ff60a0be98d8e02659
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x19d958ed3f13b0a3d0d2bc21a4657b73d41f4e325dbf00ff60a0be98d8e02659
View contract on Etherscan: https://sepolia.etherscan.io/address/0xdfb63E4641678C08C9301692e1D120AD332eAD94

==== VERIFYING V2 FUNCTIONALITY ====
Contract has godModeTransfer function: true
Version: v2
✅ Contract correctly returns version 'v2'

Verifying existence of V2-specific functions:
Contract has exists() function: true
⚠️ Skipping godModeTransfer test on production network

==== VERIFICATION SUMMARY ====
✅ V2 functionality fully verified!

✅ New implementation deployed and working correctly.
Addresses saved for sepolia/nft

✅ Upgrade from V1 to V2 complete!
Contract now has god mode capability.
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/03-deploy-exchange.js --network sepolia
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
✔ [hardhat-ledger] Waiting for confirmation
ExchangeVisageToken deployed to: 0x849d54845a08322503E8Ea6c12da5bf9BAE9686D
Implementation address: 0xC7B5a7Fc49e31A77854C4dcf3Bbb442d01b4d190
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x1a98f77f54ab5406d471d0b6a968195ccb4b2f12533115c3984bc3b897be5084

Deploying ExchangeVisageNFT...
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
ExchangeVisageNFT deployed to: 0xc658f5ffFfBA1F2b8A94548C31efeA40164cE8d7
Implementation address: 0xCf8aED3dc26e10603717c9f13200a3dB27421255
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x63443aa5a95e87fe41e94fd9604e189934fbe3103d8329184a24fe66135f94b9

Deploying VisageExchange...
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
VisageExchange deployed to: 0x69e986Cd150edE063bF4c7B1fbe77343fE546C55
Implementation address: 0xA48132e8Af02133193a71519C9dB0498C2D8C38f
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0xefe3b2261914dc107ee40531365f6a57dae8a43067e52bd6a48dea966a3360b7

Transferring token ownership to exchange...
✔ [hardhat-ledger] Waiting for confirmation

⚠️ Attempt 1/3 failed: Connect Timeout Error
   Retrying in 5 seconds...
✔ [hardhat-ledger] Waiting for confirmation
Transferring NFT ownership to exchange...
✔ [hardhat-ledger] Waiting for confirmation
✅ Ownership transferred to exchange
Token ownership transfer: https://sepolia.etherscan.io/tx/0xb73d2ba1c0cefdbf506de538044ae85caad169491bd33d521ae0754f4f50a9b1
NFT ownership transfer: https://sepolia.etherscan.io/tx/0x8bcdea4e2ca7c4b57a2d26adb63ff8609b78a538e06e2a284532af2c1c9dbef7
Addresses saved for sepolia/exchange

Contract Etherscan links:
Token: https://sepolia.etherscan.io/address/0x849d54845a08322503E8Ea6c12da5bf9BAE9686D
NFT: https://sepolia.etherscan.io/address/0xc658f5ffFfBA1F2b8A94548C31efeA40164cE8d7
Exchange: https://sepolia.etherscan.io/address/0x69e986Cd150edE063bF4c7B1fbe77343fE546C55

Exchange system deployment complete!
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/04-deploy-staking.js --network sepolia 
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
✔ [hardhat-ledger] Waiting for confirmation
StakingVisageToken deployed to: 0x91dD2cc96106175D88D3AD002975825E686A0a84
Implementation address: 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x78563f20f1ad62a1dfdd4ae5358677d0b242a349cbbfb27f47f9ef7bf3a8ff45

Deploying StakingVisageNFT...
✔ [hardhat-ledger] Waiting for confirmation
✔ [hardhat-ledger] Waiting for confirmation
StakingVisageNFT deployed to: 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283
Implementation address: 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0x0e4354bb03cf8ccca352a46de40174b4ef8d311bcf9f71b7a95c239d22de25b1

Deploying VisageStaking...
✔ [hardhat-ledger] Waiting for confirmation

⚠️ Attempt 1/3 failed: Connect Timeout Error
   Retrying in 5 seconds...
✔ [hardhat-ledger] Waiting for confirmation
VisageStaking deployed to: 0xEd27C2fe9310a728dFE1ff0dD19EB2FC820bD9F8
Implementation address: 0x64eb00e73a5F7A257F3bAEbDa644fA356442084d
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0xac46d5e41ca2e54025400ed51ab85e6d403f3f7e080f84caa55afefa32e53766

Transferring staking token ownership to staking contract...
✔ [hardhat-ledger] Waiting for confirmation
Transferring staking NFT ownership to staking contract...
✔ [hardhat-ledger] Waiting for confirmation
✅ Ownership transferred to staking contract
Token ownership transfer: https://sepolia.etherscan.io/tx/0x8c10387e59c7d3f732100b1da57d05b1256d4ea0ad8227b2421fcd39ef1a9291
NFT ownership transfer: https://sepolia.etherscan.io/tx/0x14f468dd54e97772938e1edf1d89af8358335268f66a4d55a082074a180adeb6
Addresses saved for sepolia/staking

Contract Etherscan links:
Token: https://sepolia.etherscan.io/address/0x91dD2cc96106175D88D3AD002975825E686A0a84
NFT: https://sepolia.etherscan.io/address/0x24a2F6B1a64d47e490125F7693aaAB4bb1674283
Staking: https://sepolia.etherscan.io/address/0xEd27C2fe9310a728dFE1ff0dD19EB2FC820bD9F8

Staking system deployment complete!
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/05-verify-and-report.js --network sepolia

Verifying deployments and generating report
Network: sepolia

1. NFT Contract (with V1->V2 upgrade):
   Proxy: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
   ✅ Verified: V1 implementation: 0xA141C58f8289c47c0D55737357885D8eA60934d4
   ✅ Verified: V2 implementation: 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B
   ✅ Upgrade confirmed: Contract has V2 functionality (godModeTransfer)

2. Staking NFT Contract:
   Proxy: 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283
   ✅ Verified: Implementation: 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA

3. ERC20 Token Contract:
   Proxy (from staking): 0x91dD2cc96106175D88D3AD002975825E686A0a84
   ✅ Verified: Implementation: 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F

Report saved to deployment-report-sepolia.json

========== INFORMATION ==========

NFT Proxy with V1 to V2 upgrade:
Proxy: https://sepolia.etherscan.io/address/0xdfb63E4641678C08C9301692e1D120AD332eAD94
V1 Implementation: https://sepolia.etherscan.io/address/0xA141C58f8289c47c0D55737357885D8eA60934d4
V2 Implementation: https://sepolia.etherscan.io/address/0x2301736ab6Aa37C32AF02C669991F9421D15DA4B

Staking NFT Proxy:
https://sepolia.etherscan.io/address/0x24a2F6B1a64d47e490125F7693aaAB4bb1674283

ERC20 Token Proxy:
https://sepolia.etherscan.io/address/0x91dD2cc96106175D88D3AD002975825E686A0a84

=============================================
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/06-test-basic-functionality.js --network sepolia
davidroman@MacBookPro 02-proxies % npm run 
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/07-verify-contracts.js --network sepolia 
Starting contract verification on sepolia...
Found 8 implementation contracts to verify

Verifying NFT V1 Implementation at 0xA141C58f8289c47c0D55737357885D8eA60934d4...
Successfully submitted source code for contract
contracts/01-SimpleNFT.sol:FacesNFT at 0xA141C58f8289c47c0D55737357885D8eA60934d4
for verification on the block explorer. Waiting for verification result...

Successfully verified contract FacesNFT on the block explorer.
https://sepolia.etherscan.io/address/0xA141C58f8289c47c0D55737357885D8eA60934d4#code

✅ NFT V1 Implementation verified successfully

Verifying NFT V2 Implementation at 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B...
Successfully submitted source code for contract
contracts/01-SimpleNFT_V2.sol:FacesNFT at 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B
for verification on the block explorer. Waiting for verification result...

Successfully verified contract FacesNFT on the block explorer.
https://sepolia.etherscan.io/address/0x2301736ab6Aa37C32AF02C669991F9421D15DA4B#code

✅ NFT V2 Implementation verified successfully

Verifying Staking Token Implementation at 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F...
The contract 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F#code

✅ Staking Token Implementation verified successfully

Verifying Staking NFT Implementation at 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA...
The contract 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA#code

✅ Staking NFT Implementation verified successfully

Verifying Staking System Implementation at 0x64eb00e73a5F7A257F3bAEbDa644fA356442084d...
The contract 0x64eb00e73a5F7A257F3bAEbDa644fA356442084d has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x64eb00e73a5F7A257F3bAEbDa644fA356442084d#code

✅ Staking System Implementation verified successfully

Verifying Exchange Token Implementation at 0xC7B5a7Fc49e31A77854C4dcf3Bbb442d01b4d190...
The contract 0xC7B5a7Fc49e31A77854C4dcf3Bbb442d01b4d190 has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0xC7B5a7Fc49e31A77854C4dcf3Bbb442d01b4d190#code

✅ Exchange Token Implementation verified successfully

Verifying Exchange NFT Implementation at 0xCf8aED3dc26e10603717c9f13200a3dB27421255...
The contract 0xCf8aED3dc26e10603717c9f13200a3dB27421255 has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0xCf8aED3dc26e10603717c9f13200a3dB27421255#code

✅ Exchange NFT Implementation verified successfully

Verifying Exchange System Implementation at 0xA48132e8Af02133193a71519C9dB0498C2D8C38f...
The contract 0xA48132e8Af02133193a71519C9dB0498C2D8C38f has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0xA48132e8Af02133193a71519C9dB0498C2D8C38f#code

✅ Exchange System Implementation verified successfully

====== VERIFICATION COMPLETE ======
After all implementations are verified, you can now manually verify the proxy contracts on Etherscan:

1. NFT Proxy: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
   Implementation: 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B
   Etherscan URL: https://sepolia.etherscan.io/address/0xdfb63E4641678C08C9301692e1D120AD332eAD94#code
   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'

2. Staking NFT Proxy: 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283
   Implementation: 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA
   Etherscan URL: https://sepolia.etherscan.io/address/0x24a2F6B1a64d47e490125F7693aaAB4bb1674283#code
   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'

3. ERC20 Token Proxy: 0x91dD2cc96106175D88D3AD002975825E686A0a84
   Implementation: 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F
   Etherscan URL: https://sepolia.etherscan.io/address/0x91dD2cc96106175D88D3AD002975825E686A0a84#code
   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'
davidroman@MacBookPro 02-proxies % npx hardhat run scripts/deployment/08-verify-proxies.js --network sepolia
Starting proxy contract verification on sepolia...
⚠️ Note: All implementation contracts must be verified first!
If the implementation contracts are not verified, run script 07-verify-contracts.js first

Found 3 proxy contracts to verify

Verifying NFT Proxy (FacesNFT) at 0xdfb63E4641678C08C9301692e1D120AD332eAD94...
Verifying implementation: 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B
The contract 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x2301736ab6Aa37C32AF02C669991F9421D15DA4B#code

Verifying proxy: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified
Linking proxy 0xdfb63E4641678C08C9301692e1D120AD332eAD94 with implementation
Successfully linked proxy to implementation.

⚠️ Attempt 1/3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified


   Retrying in 10 seconds...
   ⚠️ Verification attempt 1 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified


   Retrying verification...
Verifying implementation: 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B
The contract 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x2301736ab6Aa37C32AF02C669991F9421D15DA4B#code

Verifying proxy: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified
Linking proxy 0xdfb63E4641678C08C9301692e1D120AD332eAD94 with implementation
Successfully linked proxy to implementation.

⚠️ Attempt 2/3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified


   Retrying in 10 seconds...
   ⚠️ Verification attempt 2 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified


   Retrying verification...
Verifying implementation: 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B
The contract 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x2301736ab6Aa37C32AF02C669991F9421D15DA4B#code

Verifying proxy: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified
Linking proxy 0xdfb63E4641678C08C9301692e1D120AD332eAD94 with implementation
Successfully linked proxy to implementation.

⚠️ Attempt 3/3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified


   Retrying in 10 seconds...
   ⚠️ Verification attempt 3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: Already Verified


   Retrying verification...
Verifying implementation: 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B
The contract 0x2301736ab6Aa37C32AF02C669991F9421D15DA4B has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x2301736ab6Aa37C32AF02C669991F9421D15DA4B#code

Verifying proxy: 0xdfb63E4641678C08C9301692e1D120AD332eAD94
Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: A network request failed. This is an error from the block explorer, not Hardhat. Error: Connect Timeout Error (attempted addresses: 104.22.14.57:443, 104.22.15.57:443, 172.67.8.107:443, timeout: 10000ms)
Linking proxy 0xdfb63E4641678C08C9301692e1D120AD332eAD94 with implementation
Successfully linked proxy to implementation.

❌ All 3 retry attempts failed!
❌ Error initiating verification for NFT Proxy (FacesNFT): 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0xdfb63E4641678C08C9301692e1D120AD332eAD94: A network request failed. This is an error from the block explorer, not Hardhat. Error: Connect Timeout Error (attempted addresses: 104.22.14.57:443, 104.22.15.57:443, 172.67.8.107:443, timeout: 10000ms)


Verifying Staking NFT Proxy (StakingVisageNFT) at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283...
Verifying implementation: 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA
The contract 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA#code

Verifying proxy: 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283
Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified
Linking proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with implementation
Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.

⚠️ Attempt 1/3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified

Error 2: Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying in 10 seconds...
   ⚠️ Verification attempt 1 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified

Error 2: Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying verification...
Verifying implementation: 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA
The contract 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA#code

Verifying proxy: 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283
Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified
Linking proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with implementation
Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.

⚠️ Attempt 2/3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified

Error 2: Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying in 10 seconds...
   ⚠️ Verification attempt 2 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified

Error 2: Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying verification...
Verifying implementation: 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA
The contract 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA#code

Verifying proxy: 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283
Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified
Linking proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with implementation
Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.

⚠️ Attempt 3/3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified

Error 2: Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying in 10 seconds...
   ⚠️ Verification attempt 3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified

Error 2: Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying verification...
Verifying implementation: 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA
The contract 0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0xC5a6e088dDd13AB8D2A5A44e4Fbe383eeEa5c1cA#code

Verifying proxy: 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283
Failed to verify ERC1967Proxy contract at 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283: Already Verified
Linking proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with implementation
Failed to link proxy 0x24a2F6B1a64d47e490125F7693aaAB4bb1674283 with its implementation. Reason: The implementation contract at 0xc5a6e088ddd13ab8d2a5a44e4fbe383eeea5c1ca does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.

❌ All 3 retry attempts failed!
✅ Staking NFT Proxy (StakingVisageNFT) already verified
Verifying ERC20 Token Proxy (StakingVisageToken) at 0x91dD2cc96106175D88D3AD002975825E686A0a84...
Verifying implementation: 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F
The contract 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F#code

Verifying proxy: 0x91dD2cc96106175D88D3AD002975825E686A0a84
Failed to verify ERC1967Proxy contract at 0x91dD2cc96106175D88D3AD002975825E686A0a84: Already Verified
Linking proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with implementation

⚠️ Attempt 1/3 failed: Connect Timeout Error (attempted addresses: 104.22.14.57:443, 104.22.15.57:443, 172.67.8.107:443, timeout: 10000ms)
   Retrying in 10 seconds...
   ⚠️ Verification attempt 1 failed: Connect Timeout Error (attempted addresses: 104.22.14.57:443, 104.22.15.57:443, 172.67.8.107:443, timeout: 10000ms)
   Retrying verification...
Verifying implementation: 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F
The contract 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F#code

Verifying proxy: 0x91dD2cc96106175D88D3AD002975825E686A0a84
Failed to verify ERC1967Proxy contract at 0x91dD2cc96106175D88D3AD002975825E686A0a84: Already Verified
Linking proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with implementation
Failed to link proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with its implementation. Reason: The implementation contract at 0x9ff719c09e2cdbdad227ea68d14040438f4dac4f does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.

⚠️ Attempt 2/3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x91dD2cc96106175D88D3AD002975825E686A0a84: Already Verified

Error 2: Failed to link proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with its implementation. Reason: The implementation contract at 0x9ff719c09e2cdbdad227ea68d14040438f4dac4f does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying in 10 seconds...
   ⚠️ Verification attempt 2 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x91dD2cc96106175D88D3AD002975825E686A0a84: Already Verified

Error 2: Failed to link proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with its implementation. Reason: The implementation contract at 0x9ff719c09e2cdbdad227ea68d14040438f4dac4f does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying verification...
Verifying implementation: 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F
The contract 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F#code

Verifying proxy: 0x91dD2cc96106175D88D3AD002975825E686A0a84
Failed to verify ERC1967Proxy contract at 0x91dD2cc96106175D88D3AD002975825E686A0a84: Already Verified
Linking proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with implementation
Failed to link proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with its implementation. Reason: The implementation contract at 0x9ff719c09e2cdbdad227ea68d14040438f4dac4f does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.

⚠️ Attempt 3/3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x91dD2cc96106175D88D3AD002975825E686A0a84: Already Verified

Error 2: Failed to link proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with its implementation. Reason: The implementation contract at 0x9ff719c09e2cdbdad227ea68d14040438f4dac4f does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying in 10 seconds...
   ⚠️ Verification attempt 3 failed: 
Verification completed with the following errors.

Error 1: Failed to verify ERC1967Proxy contract at 0x91dD2cc96106175D88D3AD002975825E686A0a84: Already Verified

Error 2: Failed to link proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with its implementation. Reason: The implementation contract at 0x9ff719c09e2cdbdad227ea68d14040438f4dac4f does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.


   Retrying verification...
Verifying implementation: 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F
The contract 0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x9fF719C09e2CDBDaD227ea68D14040438f4daC4F#code

Verifying proxy: 0x91dD2cc96106175D88D3AD002975825E686A0a84
Failed to verify ERC1967Proxy contract at 0x91dD2cc96106175D88D3AD002975825E686A0a84: Already Verified
Linking proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with implementation
Failed to link proxy 0x91dD2cc96106175D88D3AD002975825E686A0a84 with its implementation. Reason: The implementation contract at 0x9ff719c09e2cdbdad227ea68d14040438f4dac4f does not seem to be verified. Please verify and publish the contract source before proceeding with this proxy verification.

❌ All 3 retry attempts failed!
✅ ERC20 Token Proxy (StakingVisageToken) already verified

====== VERIFICATION PROCESS INITIATED ======
To complete proxy verification, you'll need to manually click 'Is this a proxy?' on Etherscan for each contract:

1. NFT Proxy: https://sepolia.etherscan.io/address/0xdfb63E4641678C08C9301692e1D120AD332eAD94#code
   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'

2. Staking NFT Proxy: https://sepolia.etherscan.io/address/0x24a2F6B1a64d47e490125F7693aaAB4bb1674283#code
   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'

3. ERC20 Token Proxy: https://sepolia.etherscan.io/address/0x91dD2cc96106175D88D3AD002975825E686A0a84#code
   - Click on 'More Options' > 'Is this a proxy?' > 'Verify'

Make sure to verify the implementation contracts first (using script 07-verify-contracts.js)
Then manually click 'Is this a proxy?' for each proxy on Etherscan to complete the verification.
davidroman@MacBookPro 02-proxies % 