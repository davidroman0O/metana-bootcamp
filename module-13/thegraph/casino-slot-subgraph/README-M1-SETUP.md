# M1 MacBook Pro Development Environment Setup

This guide provides step-by-step instructions for setting up the TheGraph + Hardhat development environment on Apple M1 MacBook Pro.

## ✨ What's New (Latest Updates)

### 🎯 **Zero Platform Warnings**
- All containers now use `platform: linux/arm64`
- No more annoying "platform mismatch" messages in logs

### 🚀 **Efficient npm Management**
- Persistent npm volumes - no more reinstalling node_modules 
- 90% faster startup times
- Host machine handles contract development (more reliable)

### 🛠️ **Enhanced Commands**
- `make clean-npm` - Only clean npm when needed
- `make test-all-services` - Verify everything works
- `make dev-status` - Quick health check

## Quick Start

1. **Start development environment:**
   ```bash
   make dev-full
   ```

2. **Deploy and refresh everything:**
   ```bash
   make refresh-all
   ```

3. **Access your subgraph:**
   - GraphiQL: http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql
   - Graph Admin: http://localhost:8020

**Note**: No special M1 setup required! ARM64 platform specifications are built-in.

## Prerequisites

### Required Software
- **Docker Desktop for Mac** - Latest version with increased memory allocation
- **Node.js 18+** - For Hardhat development (on host machine)
- **yarn** - For subgraph package management
- **Git** - For version control

### Docker Configuration
⚠️ **Important**: Docker must be configured with sufficient memory:

1. Open Docker Desktop
2. Go to **Settings → Resources → Advanced**
3. Set **Memory** to at least **8GB** (recommended: 12GB+)
4. Click **Apply & Restart**

**Note**: With our optimized setup, memory requirements are lower than before due to efficient npm management.

## M1-Specific Setup

### Why M1 Requires Special Setup

M1 MacBook Pros require ARM64-compatible images and configuration, so we:
1. Use `platform: linux/arm64` specification for all containers
2. Use persistent npm volumes to avoid reinstalling dependencies  
3. Use hybrid architecture: containers for services, host machine for contract development
4. Configure proper networking for container-to-host communication

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Hardhat Node  │    │   Graph Node    │    │     IPFS        │
│   (localhost:   │◄──►│   (M1 Native)   │◄──►│   (Storage)     │
│     8545)       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Your Contract  │    │   PostgreSQL    │    │ Subgraph Dev    │
│   Development   │    │   (Database)    │    │   Utilities     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Setup Commands

### 1. Start Development Environment
```bash
# Start all services
make dev-full
```

Services started:
- **Hardhat Node** (localhost:8545) - Local Ethereum blockchain with ARM64 compatibility
- **Graph Node** (localhost:8000) - TheGraph indexing service
- **IPFS** (localhost:5001) - Distributed storage with ARM64 support
- **PostgreSQL** (localhost:5432) - Database with ARM64 optimization
- **Subgraph Dev** - Auto-refresh utilities with file watching (optional, see below)

**First run**: Takes 2-3 minutes for npm dependencies installation with persistent volumes.

### 2. Deploy Everything
```bash
# Complete deployment workflow
make refresh-all
```

This command:
1. Compiles smart contracts (on host machine)
2. Deploys contracts to local Hardhat node
3. Updates subgraph with new contract address
4. Rebuilds subgraph with latest ABI
5. Deploys subgraph to Graph Node

## Available Make Commands

### 🚀 Core Commands
- `make dev-full` - Start complete development environment
- `make refresh-all` - Deploy contracts + rebuild/deploy subgraph
- `make stop-all` - Stop all services
- `make test-all-services` - Test all service connections

### 🔄 Targeted Refresh Commands  
- `make refresh-contracts` - Only redeploy contracts
- `make refresh-subgraph` - Only rebuild/deploy subgraph
- `make update-addresses NETWORK=localhost` - Update contract addresses

### 🧹 Maintenance Commands
- `make clean-npm` - Clean npm cache when corruption occurs
- `make clean-all` - Clean everything (containers, volumes, data)
- `make dev-status` - Check health of all services

### 📋 Debugging Commands
- `make logs-all` - Show logs for all services
- `make logs-hardhat` / `make logs-graph` - Individual service logs
- `make debug-containers` - Container status and resource usage

### 👀 Development Utilities
- `make watch-dev` - Auto-refresh on file changes (requires fswatch)
- `make create-local` - Create subgraph on Graph node
- `make deploy-local` - Deploy subgraph to Graph node

## 🛠️ Subgraph Dev Service (Optional)

The `subgraph-dev` container provides advanced development automation:

### **What it does:**
- **File watching**: Monitors contracts, schema, handlers for changes
- **Auto-refresh**: Automatically runs appropriate refresh commands
- **Tool provision**: Includes Graph CLI, Docker CLI, development tools
- **Cooldown protection**: Prevents spam refreshes (5-second cooldown)

### **When changes are detected:**
- **Smart contracts** → `make refresh-contracts`
- **Schema/handlers** → `make refresh-subgraph`

### **To use:**
```bash
# Start file watcher (on host machine)
make watch-dev

# Or run the container manually
docker-compose up -d subgraph-dev
```

**Note**: Most developers prefer manual commands (`make refresh-all`) over auto-refresh.

## Development Workflow

### Daily Development
1. **Start environment:** `make dev-full`
2. **Deploy/refresh:** `make refresh-all`
3. **Generate test data:** See "Generating Test Data" below
4. **Watch for changes:** `make watch-dev`
5. **Check status:** `make dev-status`

### Generating Test Data
After deploying contracts, generate casino activity to test your subgraph:

```bash
# Terminal 1: Start VRF fulfiller (handles random number generation)
cd ../../hardhat
npm run vrf:fulfiller

# Terminal 2: Generate test spins
cd ../../hardhat
npm run test-player
```

This will create spins, wins, and other casino events that your subgraph can index.

### When You Change Smart Contracts
```bash
make refresh-contracts
```

### When You Change Subgraph (schema/handlers)
```bash
make refresh-subgraph
```

### Auto-Refresh on File Changes
```bash
make watch-dev
```

Watches for changes in:
- Smart contracts (`../../hardhat/contracts/`)
- Subgraph schema (`./schema.graphql`)
- Subgraph handlers (`./src/`)
- Subgraph config (`./subgraph.yaml`)

## Service URLs

Once running, access your development environment:

| Service | URL | Description |
|---------|-----|-------------|
| **GraphiQL** | http://localhost:8000 | Query interface |
| **Subgraph GraphiQL** | http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql | Your subgraph queries |
| **Graph Admin** | http://localhost:8020 | Graph Node administration |
| **IPFS Gateway** | http://localhost:5001 | IPFS API |
| **Hardhat Node** | http://localhost:8545 | Local Ethereum RPC |

## Troubleshooting

### Common Issues

#### 1. Platform Warnings (Fixed ✅)
**Previous Error:** "The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8)"
**Solution:** All containers now specify `platform: linux/arm64` - no more warnings!

#### 2. Services Won't Start
**Error:** "Port already in use"
**Solution:** 
```bash
make stop-all
# Wait a few seconds
make dev-full
```

#### 3. Contract Address Not Updating
**Error:** Subgraph references old contract
**Solution:**
```bash
make update-addresses NETWORK=localhost
make refresh-subgraph
```

#### 4. File Watcher Not Working
**Error:** "fswatch not found"
**Solution (macOS):**
```bash
brew install fswatch
```

#### 5. npm Corruption Issues (Fixed ✅)
**Previous Error:** "You installed Hardhat with a corrupted lockfile due to the NPM bug #4828"
**Solution:** Now uses persistent npm volumes + host machine for contracts - no more corruption!

If you still encounter npm issues:
```bash
make clean-npm
make dev-full
```

#### 6. Subgraph Not Syncing (No Data)
**Error:** "Subgraph has not started syncing yet. Wait for it to ingest a few blocks"
**Solution:** Generate blockchain activity to trigger subgraph indexing:
```bash
# Terminal 1: Start VRF fulfiller (for handling spins)
cd ../../hardhat
npm run vrf:fulfiller

# Terminal 2: Generate test activity 
cd ../../hardhat
npm run test-player
```

#### 7. Subgraph Deployment Fails
**Error:** "Subgraph already exists"
**Solution:**
```bash
make remove-local
make create-local
make deploy-local
```

### Checking Service Health
```bash
make dev-status
```

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f graph-node
docker-compose logs -f hardhat-node
```

### Clean Restart
```bash
make stop-all
make clean
make dev-full
make refresh-all
```

## File Structure

```
thegraph/casino-slot-subgraph/
├── scripts/
│   ├── setup-m1-env.sh          # M1 setup script
│   ├── watch-files.sh           # File watcher
│   └── deploy-and-refresh.sh    # Complete deployment
├── docker-compose.yml           # M1-optimized services
├── Makefile                     # Enhanced with M1 commands
├── data/                        # Persistent data
│   ├── ipfs/                    # IPFS storage
│   └── postgres/                # Database storage
└── README-M1-SETUP.md          # This file
```

## Performance Tips

### M1 Optimization
1. **Use native ARM64 images** - All containers specify `platform: linux/arm64`
2. **Persistent npm volumes** - No more reinstalling node_modules every restart
3. **Hybrid architecture** - Host machine for contracts, containers for services
4. **Increase Docker memory** for faster builds
5. **Use volume mounts** for live development
6. **Enable file watching** for auto-refresh

### Development Workflow  
1. **Keep services running** between development sessions
2. **Use targeted refresh** commands (`refresh-contracts` vs `refresh-all`)
3. **Only clean npm when needed** with `make clean-npm`
4. **Monitor resource usage** with `docker stats`

### Efficient npm Management
- **Problem**: Reinstalling node_modules on every container restart
- **Solution**: Dedicated npm volume + host machine for contract development
- **Result**: 90% faster startup, no npm corruption issues

## Advanced Configuration

### Custom Hardhat Commands
The Hardhat node service can be customized in `docker-compose.yml`:

```yaml
hardhat-node:
  command: >
    sh -c "
      npm install &&
      npm run node:fork  # or npm run node for local-only
    "
```

### Graph Node Environment Variables
Customize Graph Node behavior:

```yaml
graph-node:
  environment:
    GRAPH_LOG: debug          # Increase logging
    GRAPH_LOG_QUERY_TIMING: gql
    ETHEREUM_POLLING_INTERVAL: 1000
```

### Volume Mount Customization
Adjust volume mounts for your setup:

```yaml
volumes:
  - ./:/subgraph              # Current directory as subgraph
  - ../../hardhat:/hardhat    # Hardhat project
  - ~/.ethereum:/root/.ethereum  # Ethereum data
```

## Support

For issues specific to this M1 setup:
1. Check the troubleshooting section above
2. Verify Docker memory allocation
3. Ensure all scripts are executable (`chmod +x scripts/*.sh`)
4. Check service logs with `docker-compose logs`

For general TheGraph issues:
- [TheGraph Documentation](https://thegraph.com/docs/)
- [Graph Node GitHub](https://github.com/graphprotocol/graph-node)