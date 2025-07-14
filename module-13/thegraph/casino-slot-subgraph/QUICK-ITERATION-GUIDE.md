# Quick Iteration Guide for Casino Slot Subgraph

This guide explains the optimized workflow for rapid development iterations without waiting for the forked mainnet to resync.

## Key Optimizations Implemented

### 1. **Deployment Block Tracking**
- The deployment script now captures the block number when contracts are deployed
- The subgraph automatically starts syncing from this block instead of block 0
- This eliminates syncing 19 million historical mainnet blocks

### 2. **Mitigated: Graph Node Flooding Issue**
- Graph Node floods Hardhat with `eth_getTransactionReceipt` requests making it unresponsive
- **Partial Fix**: `make dev` now starts only essential services first, delays graph-node startup
- **Additional Measures**: Added environment variables to reduce request rate
- **Workaround**: Use helper commands when running scripts (see below)

### 3. **Persistent Fork State**
- Docker volumes preserve hardhat cache and artifacts
- The forked mainnet state persists between container restarts
- No need to wait 2-3 minutes for fork initialization

## Quick Commands

### Initial Setup (Once)
```bash
# Start all services and deploy everything
make dev

# Or if you need more control:
make dev-start        # Start services
make deploy-all       # Deploy contracts and subgraph (handles graph-node)
```

### Rapid Iteration Commands

#### For Contract Updates
```bash
# Deploy new contracts and update subgraph (fork stays running)
make quick-update
```
This command:
1. Deploys new contracts to the running hardhat node
2. Captures the deployment block number
3. Updates subgraph configuration with new address and block
4. Rebuilds and redeploys the subgraph
5. **Total time: ~30 seconds**

#### For Subgraph-Only Changes
```bash
# Update subgraph without redeploying contracts
make quick-sync
```
This command:
1. Updates subgraph configuration from latest deployment
2. Rebuilds the subgraph
3. Redeploys to Graph Node
4. **Total time: ~15 seconds**

## Best Practices

### 1. **Keep Services Running**
```bash
# NEVER do this during development:
# make dev-stop  # ❌ This kills the fork!

# Instead, keep services running and use:
make preserve-fork  # Shows reminder about quick commands
```

### 2. **Batch Your Changes**
- Make multiple contract changes before deploying
- Update multiple subgraph handlers before syncing
- This minimizes the number of redeploys needed

### 3. **Monitor Progress**
```bash
# Watch Graph Node logs during sync
make logs-graph

# Check hardhat status
make hardhat-status
```

## Workflow Examples

### Example 1: Updating Contract Logic
```bash
# 1. Edit your contract files
# 2. Run quick update (contracts + subgraph)
make quick-update
# 3. Test your changes immediately!
```

### Example 2: Adding New Event Handler
```bash
# 1. Edit schema.graphql and mapping files
# 2. Run quick sync (subgraph only)
make quick-sync
# 3. Query new data in GraphiQL
```

### Example 3: Complete Feature Development
```bash
# 1. Start fresh (only if needed)
make dev-clean
make dev-start
make wait-for-hardhat
make deploy-all

# 2. Iterate on contracts
# ... edit contracts ...
make quick-update

# 3. Iterate on subgraph
# ... edit mappings ...
make quick-sync

# 4. Keep going without restarts!
```

## Troubleshooting

### If Sync Seems Slow
1. Check the deployment block in subgraph.yaml
2. Ensure it's not set to 0 (would sync all 19M blocks)
3. Run `make update-addresses NETWORK=localhost` to update

### If Services Crash
```bash
# Restart just the crashed service
docker-compose restart graph-node  # or hardhat-node

# Services will reconnect automatically
```

### Manual Block Number Update
If automatic block capture fails:
```bash
# In hardhat console
await ethers.provider.getBlockNumber()
# Note the number, then manually edit subgraph.yaml
```

## Performance Gains

## Fixed: Graph Node and Hardhat Compatibility

**Previous Issue**: Graph Node used to flood Hardhat with `eth_getTransactionReceipt` requests, causing Hardhat to become unresponsive.

**Solution**: The development workflow now properly orchestrates services to prevent this issue entirely.

### ✅ Issue I had: Graph-Node and Hardhat Compatibility Fixed

**Previous Problem**: Graph-node would flood hardhat with historical block requests, making it unresponsive.

**Root Cause**: Graph-node's default `ETHEREUM_REORG_THRESHOLD=250` caused it to fetch 250 blocks of history for chain reorganization protection, overwhelming hardhat's forked node.

**Solution Applied** (Fixed 2025-07-08):
- Added `ETHEREUM_REORG_THRESHOLD: 1` to docker-compose.yml
- Added `ETHEREUM_ANCESTOR_COUNT: 1` to docker-compose.yml
- Updated hardhat command to include `--hostname 0.0.0.0`

**Current Status**:
- Graph-node and hardhat work together without issues
- Scripts like `vrf:fulfiller` and `test:multi-player` run normally
- No RPC timeouts or blocking behavior
- All services can run simultaneously

I learned something important on how to administrate those setup!

### Working Procedures

#### Fresh Start (Clean Environment)
```bash
# Simple one-command setup
make dev

# This automatically:
# 1. Starts only essential services (postgres, ipfs, hardhat)
# 2. Waits for hardhat to be ready
# 3. Deploys contracts
# 4. Starts graph-node AFTER contracts are deployed
# 5. Deploys the subgraph
```

#### Manual Control
```bash
# If you need more control:
make dev-start        # Start essential services only
make deploy-all       # Deploy contracts, then start graph-node, then deploy subgraph
```

✅ **Feature**: Graph-node and hardhat now work together without conflicts.

### Running Hardhat Scripts

Scripts now work normally alongside graph-node:

```bash
# Run VRF fulfiller
cd ../../hardhat
npm run vrf:fulfiller

# Run multi-player test  
npm run test:multi-player

# Run any other script
npm run test-player
```

No special handling or pausing of graph-node is required.

### Actual Test Results

1. **Deployment Block Tracking**: ✅ Working
   - Deploy script successfully captures block number (e.g., 19000017)
   - Makefile correctly updates startBlock in subgraph.yaml
   - Subgraph starts from deployment block instead of block 0

2. **Quick Commands**: ✅ Working with caveats
   - `make quick-update`: Requires manual graph-node management
   - `make quick-sync`: Works with graph-node running
   - `make deploy-all`: Now handles graph-node automatically

3. **Performance Issues**: ✅ Resolved
   - Added critical environment variables to prevent flooding
   - Hardhat remains responsive with graph-node running
   - Scripts can connect and execute normally
   - No more RPC timeouts or health check failures

### Best Practices Learned

1. **Service Management**
   - All services can run together without conflicts
   - Deploy contracts and run scripts with graph-node active
   - No need to stop/start services for different tasks
   - Direct script execution works fine

2. **Timing Issues**
   - Hardhat takes ~2 minutes to fork mainnet
   - Graph-node starts flooding immediately on startup (within 10 seconds)
   - Deploy subgraph quickly after starting graph-node
   - Hardhat becomes completely unresponsive once graph-node is running

3. **Alternative Solutions**
   - Consider using Ganache instead (better graph-node compatibility)
   - Use Anvil from Foundry for potentially better performance
   - Deploy to testnet for more stable development
   - Run a separate RPC endpoint for graph-node (not sharing with scripts)

## Summary

The key to fast iteration is:
1. **Never restart the hardhat fork** - Keep it running
2. **Use deployment blocks** - Only sync what's needed
3. **Use quick commands** - `make quick-update` and `make quick-sync`
4. **Batch changes** - Deploy once, test many

Happy developing! 🚀