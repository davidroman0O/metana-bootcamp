# Advanced NFT

This is an NFT contract featuring advanced functionality:

1. Merkle Tree Airdrop - Only addresses in the merkle tree can mint during private sale
2. Gas Cost Comparison - Bitmap vs mapping implementation for tracking claimed tokens
3. Commit-Reveal - Random NFT ID allocation with 10-block reveal delay
4. Multicall - Transfer multiple NFTs in one transaction
5. State Machine - Handles different contract states (Inactive, PrivateSale, PublicSale, SoldOut, Revealed)
6. Pull Pattern - Secure fund distribution to multiple contributors

## How to Use

### Installation

```bash
# Install dependencies
npm install
```

### Tests

```bash
npx hardhat test
```

### Deployment

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Generate Merkle Tree

```bash
npx hardhat run scripts/generateMerkleTree.js --network localhost
```

### Gas Cost Comparison

```bash
npx hardhat run scripts/compareGasCosts.js --network localhost
```

### Simulate Commit-Reveal

```bash
npx hardhat run scripts/simulateCommitReveal.js --network localhost
```

## Contract Functions

### State Management
```solidity
// View current state
state() 

// Change state (onlyOwner)
setState(State _state)  // States: Inactive(0), PrivateSale(1), PublicSale(2), SoldOut(3), Revealed(4)
```

### Merkle Tree Airdrop (PrivateSale)
```solidity
// Claim with bitmap (more gas efficient)
claimWithBitmap(uint256 index, bytes32[] calldata proof)

// Claim with mapping (for comparison)
claimWithMapping(uint256 index, bytes32[] calldata proof)
```

### Public Sale
```solidity
// Mint tokens during public sale (payable)
publicMint(uint256 quantity)
```

### Commit-Reveal
```solidity
// Submit commitment
commit(bytes32 payload)

// Reveal after BLOCKS_FOR_REVEAL blocks (10)
reveal(bytes32 secret)
```

### Multicall
```solidity
// Execute multiple calls in a single transaction
multicall(bytes[] calldata data)

// Helper for generating transfer data
getTransferData(address to, uint256 tokenId)
```

### Contributor Management
```solidity
// Add a contributor (onlyOwner)
addContributor(address payable contributor, uint256 share)

// Remove a contributor (onlyOwner)
removeContributor(address contributor)

// Allocate funds to contributors (onlyOwner)
allocateFunds()

// Withdraw allocated funds (pull pattern)
withdraw()
```

## Implementation Details

### Merkle Tree
- Leaf nodes are `keccak256(abi.encodePacked(address, index))`
- Two implementations for gas comparison: bitmap and mapping
- Gas measurements show bitmap is more efficient for large collections

### Commit-Reveal
- User submits commitment hash: `keccak256(abi.encodePacked(msg.sender, secret))`
- After 10 blocks, user reveals secret
- Random token ID is generated using: `keccak256(abi.encodePacked(msg.sender, secret, blockhash(commitBlock)))`

### State Machine
The contract has 5 states:
1. Inactive - Default state, no minting allowed
2. PrivateSale - Only whitelisted addresses can mint with merkle proof
3. PublicSale - Anyone can mint by paying the public sale price
4. SoldOut - All tokens have been minted
5. Revealed - Tokens have been revealed and show actual metadata 

