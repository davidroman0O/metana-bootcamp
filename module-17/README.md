# DAO Governance System

A complete on-chain governance system with OpenZeppelin Governor + Snapshot integration for gasless voting.

## What's Included

- **GovernanceToken**: ERC20 token with voting power (ERC20Votes)
- **DAOGovernor**: On-chain governance with automatic execution
- **Timelock**: 5-minute delay for security
- **Snapshot Integration**: Gasless voting with manual execution

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Create `.env` file:
```env
# Required
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key

# For Snapshot
SNAPSHOT_SPACE=s-tn:0xarkaw.eth  # Your testnet space

# Ledger
LEDGER_ACCOUNT=0  # First account
```

### 3. Run Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## Deploy to Sepolia

### Option 1: Deploy with Regular Wallet

```bash
npx hardhat run scripts/sepolia/deploy-governance.js --network sepolia
```

### Option 2: Deploy with Ledger

1. Connect Ledger and open Ethereum app
2. Enable "Blind signing" in Ledger settings
3. Run deployment:

```bash
npx hardhat run scripts/sepolia/deploy-governance-ledger.js --network sepolia
```

### 4. Verify on Etherscan

```bash
npx hardhat run scripts/sepolia/verify-contracts.js --network sepolia
```

## On-Chain Governance Commands

### Basic Setup

```bash
# Check deployed contracts
npx hardhat gov:addresses --network sepolia

# Check your token balance
npx hardhat token:balance --address 0xYourAddress --network sepolia

# Delegate voting power to yourself (REQUIRED!)
npx hardhat gov:delegate --to self --network sepolia

# Grant minting permission to Timelock
npx hardhat gov:setup-timelock --network sepolia
```

### Create and Execute Proposal

**1. Create a proposal to mint 100 tokens:**
```bash
npx hardhat gov:propose-mint --to 0xYourAddress --amount 100 --network sepolia
```

Save the Proposal ID from output!

**2. Vote on proposal (wait 1 block first):**
```bash
npx hardhat gov:vote --proposalid YOUR_PROPOSAL_ID --support 1 --network sepolia
```

**3. Check proposal status:**
```bash
npx hardhat gov:list --limit 1 --network sepolia
```

**4. Queue proposal (after voting ends - 20 blocks):**
```bash
npx hardhat gov:queue --proposalid YOUR_PROPOSAL_ID --network sepolia
```

**5. Execute proposal (after 5-minute timelock):**
```bash
npx hardhat gov:execute --proposalid YOUR_PROPOSAL_ID --network sepolia
```

**6. Verify tokens were minted:**
```bash
npx hardhat token:balance --address 0xYourAddress --network sepolia
```

## Snapshot Integration (Gasless Voting)

### Setup Snapshot Space

1. Go to https://testnet.snapshot.box
2. Create/configure your space with:
   - **Voting strategy**: `erc20-votes` (NOT `erc20-balance-of`)
   - **Token address**: Your deployed GovernanceToken
   - **Quorum**: 4
   - **Voting period**: 1h (testing) or 24-72h (production)

### Create Proposal on Snapshot

1. Click "New proposal" on Snapshot
2. Add title and description
3. If you want it executable, include: "mint 100 tokens to 0xAddress"
4. Sign and publish (FREE!)

### Execute Passed Proposals

**Option 1: Execute specific proposal**
```bash
PROPOSAL_ID=0x... npx hardhat run scripts/snapshot/execute-snapshot-proposal.js --network sepolia
```

**Option 2: Scan and execute all passed proposals**
```bash
npx hardhat run scripts/snapshot/execute-passed-proposals.js --network sepolia
```

**Option 3: Monitor mode (auto-check every 5 minutes)**
```bash
npx hardhat run scripts/snapshot/execute-passed-proposals.js --monitor --network sepolia
```

## Key Differences

| Feature | On-Chain Governor | Snapshot |
|---------|------------------|----------|
| **Voting Cost** | ~$25-125 | FREE |
| **Execution** | Automatic | Manual |
| **Binding** | Yes | Social consensus |
| **Best For** | Critical decisions | Community polling |

## Common Commands Reference

### Token Management
```bash
# Check token info
npx hardhat token:info --network sepolia

# Mint tokens (requires MINTER_ROLE)
npx hardhat token:mint --to 0xAddress --amount 1000 --network sepolia

# Transfer tokens
npx hardhat token:transfer --to 0xAddress --amount 100 --network sepolia

# Check balance
npx hardhat token:balance --address 0xAddress --network sepolia
```

### Governance Commands
```bash
# List all proposals
npx hardhat gov:list --network sepolia

# Check specific proposal
npx hardhat gov:votes --proposalid PROPOSAL_ID --network sepolia

# Check governance state
npx hardhat gov:state --network sepolia

# Delegate voting power
npx hardhat gov:delegate --to 0xAddress --network sepolia
```

### Analysis Commands
```bash
# Analyze voting power distribution
npx hardhat analyze:voting-power --network sepolia

# Check delegation status
npx hardhat analyze:delegations --network sepolia

# Analyze specific proposal
npx hardhat analyze:proposal --proposalid PROPOSAL_ID --network sepolia
```

## Important Notes

1. **Always delegate voting power** before creating proposals
2. **Timelock needs MINTER_ROLE** to mint tokens
3. **Snapshot votes are not binding** - someone must execute manually
4. **Save your proposal IDs** - you'll need them for voting/execution

## Contract Addresses

After deployment, find your contracts in:
```bash
cat addresses/sepolia.json
```

## Troubleshooting

**"Insufficient voting power"**
- Make sure you delegated to yourself: `npx hardhat gov:delegate --to self --network sepolia`

**"Missing MINTER_ROLE"**
- Grant role to Timelock: `npx hardhat gov:setup-timelock --network sepolia`

**"Proposal not found"**
- Check proposal ID is correct
- Make sure you're on the right network

**Snapshot execution fails**
- Ensure your wallet has MINTER_ROLE
- Check proposal actually passed
- Verify transaction data is correct

## Architecture

```
User → GovernanceToken → DAOGovernor → Timelock → Execute
         (voting power)   (proposals)   (delay)    (action)

Snapshot → Manual Execution
(gasless)   (by admin/multisig)
```

## Security

- 5-minute timelock delay prevents malicious proposals
- 4% quorum requirement
- 1000 token proposal threshold
- All contracts verified on Etherscan

## License

MIT