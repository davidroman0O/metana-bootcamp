# Advanced NFT

This is my NFT project with multiple features:

1. Merkle Tree Airdrop - Only addresses in the merkle tree can mint
2. Gas Cost Comparison - I compared bitmap vs mapping for tracking mints
3. Commit-Reveal - Random NFT IDs
4. Multicall - Transfer multiple NFTs at once
5. State Machine - Different states for minting
6. Fund Distribution - Contributors can withdraw funds

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
npx hardhat run scripts/deploy.js
```

### Generate Merkle Tree

```bash
npx hardhat run scripts/generateMerkleTree.js
```

### Gas Cost Comparison

```bash
npx hardhat run scripts/compareGasCosts.js
```

### Simulate Commit-Reveal

```bash
npx hardhat run scripts/simulateCommitReveal.js
```

## Contract Functions

### Presale Minting
```
presaleMintWithBitmap(index, proof)
presaleMintWithMapping(index, proof)
```

### Public Sale
```
publicMint(quantity)
```

### Commit-Reveal
```
submitCommit(commitHash)
reveal(nonce)
```

### Multicall
```
multicall(data)
```

### Contributors
```
addContributor(address, share)
allocateFunds()
withdraw()
``` 