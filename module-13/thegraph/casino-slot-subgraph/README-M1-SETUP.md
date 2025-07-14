# M1 MacBook Pro Development Environment Setup

This guide provides step-by-step instructions for setting up the TheGraph + Hardhat development environment on Apple M1 MacBook Pro with a developer-controlled workflow.

## ✨ Key Features

### 🎯 **Developer-Controlled Workflow**
- All services exposed to host ports - no hidden Docker networks
- Manual control over deployment timing
- Easy reset and redeploy for rapid iteration
- Clean separation between infrastructure and deployment

### 🚀 **Optimized for M1**
- All containers use `platform: linux/arm64`
- No platform mismatch warnings
- Persistent volumes for faster restarts
- Host-based command orchestration

### 🛠️ **Enhanced Commands**
- `make dev-start` - Start infrastructure with intelligent service checks
- `make deploy-all` - Deploy contracts and subgraph (with automatic wait)
- `make reset-all` - Redeploy everything quickly
- `make wait-for-hardhat` - Wait with progress updates
- `make hardhat-status` - Detailed health check showing RPC readiness

## Quick Start

1. **Start development environment:**
   ```bash
   make dev-start
   ```

2. **Deploy everything (waits for hardhat automatically):**
   ```bash
   make deploy-all
   ```

3. **Access your subgraph:**
   - GraphiQL: http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql
   - Graph Admin: http://localhost:8020

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

## Architecture Overview

### Developer-Controlled Design
```
┌─────────────────┐                      ┌─────────────────┐
│   Host Machine  │                      │ Docker Containers│
│                 │                      │                 │
│  make commands  │─────controls────────►│  - Hardhat Node │
│  npm/yarn       │                      │  - Graph Node   │
│  Contract dev   │◄────exposes ports────│  - IPFS         │
│                 │     (all on host)    │  - PostgreSQL   │
└─────────────────┘                      └─────────────────┘

All services communicate via localhost ports:
- Hardhat: 8545
- Graph Node: 8000, 8020, 8030, 8040  
- IPFS: 5001, 8080
- PostgreSQL: 5432
```

### Key Design Principles
1. **No Hidden Networks** - All services accessible from host
2. **Manual Control** - Deploy when you want, not automatically
3. **Easy Reset** - Single command to redeploy everything
4. **Host Commands** - All control via Makefile from host machine

## Developer Workflow

### Initial Setup
```bash
# 1. Start infrastructure
make dev-start

# You'll see output like:
# 🧪 Testing service availability:
#    PostgreSQL: ✅ Ready
#    IPFS: ✅ Ready
#    Graph Node: ✅ Ready
#    Hardhat Node: ⏳ Starting (forking mainnet...)

# 2. Check hardhat readiness (optional)
make hardhat-status

# 3. Deploy everything (includes automatic wait)
make deploy-all

# 4. Start developing!
```

### Daily Development Cycle
```bash
# Morning: Start services
make dev-start

# Deploy latest code
make deploy-all

# Make changes to contracts/subgraph...

# Quick reset after changes
make reset-all

# End of day: Stop services
make dev-stop
```

### Clean Slate Start
```bash
# Remove everything and start fresh
make dev-clean
make dev-start
make deploy-all
```

## Available Commands

### 🚀 Infrastructure Management
| Command | Description |
|---------|-------------|
| `make dev-start` | Start all Docker containers |
| `make dev-stop` | Stop all containers |
| `make dev-clean` | Remove containers and volumes |
| `make wait-for-hardhat` | Wait for hardhat node to be ready |

### 📦 Deployment Control
| Command | Description |
|---------|-------------|
| `make deploy-contracts` | Deploy smart contracts to hardhat |
| `make fund-contract` | Send ETH to contract for VRF |
| `make deploy-subgraph` | Deploy subgraph to graph-node |
| `make deploy-all` | Deploy everything (includes wait) |

### 🔄 Reset Commands
| Command | Description |
|---------|-------------|
| `make reset-contracts` | Redeploy contracts only |
| `make reset-subgraph` | Remove and redeploy subgraph |
| `make reset-all` | Complete reset (contracts + subgraph) |

### 🔍 Debugging Commands
| Command | Description |
|---------|-------------|
| `make logs-all` | View all container logs |
| `make logs-hardhat` | View hardhat node logs |
| `make logs-graph` | View graph-node logs |
| `make test-all-services` | Test service connectivity |
| `make debug-containers` | Show container status |
| `make hardhat-status` | Detailed hardhat health check |
| `make test-hardhat` | Quick hardhat connectivity test |

## Service URLs

Once running, access your development environment:

| Service | URL | Description |
|---------|-----|-------------|
| **Hardhat RPC** | http://localhost:8545 | Local Ethereum node |
| **GraphiQL** | http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql | Query your subgraph |
| **Graph Status** | http://localhost:8000 | Graph node status |
| **Graph Admin** | http://localhost:8020 | Administration interface |
| **IPFS API** | http://localhost:5001 | IPFS node API |
| **IPFS Gateway** | http://localhost:8080 | IPFS web gateway |
| **PostgreSQL** | localhost:5432 | Database (user: graph-node, pass: let-me-in) |

## Common Workflows

### Making Contract Changes
```bash
# 1. Edit contracts in /hardhat/contracts/
# 2. Redeploy contracts
make reset-contracts

# Subgraph automatically picks up new address
```

### Making Subgraph Changes
```bash
# 1. Edit schema.graphql or mappings in /src/
# 2. Rebuild and redeploy subgraph
make reset-subgraph
```

### Complete Reset (Most Common)
```bash
# Redeploy everything - contracts and subgraph
make reset-all
```

### Generating Test Data
After deploying, generate casino activity:

```bash
# Terminal 1: Start VRF fulfiller
cd ../../hardhat
npm run vrf:fulfiller

# Terminal 2: Generate test spins
cd ../../hardhat
npm run test-player
```

## Health Checks and Monitoring

### Intelligent Health Checks
The setup includes sophisticated health checks that go beyond simple port connectivity:

#### Quick Status Check
```bash
make dev-start
# Shows immediate status of all services
# Hardhat will show "⏳ Starting" while forking mainnet
```

#### Detailed Hardhat Health Check
```bash
make hardhat-status
# Tests multiple RPC methods:
# ✓ Chain ID - Basic connectivity
# ✓ Block number - Sync status  
# ✓ Accounts - Transaction readiness
# ✓ Gas estimation - Full functionality
# ✓ Network version - Network readiness
```

#### Wait with Progress
```bash
make wait-for-hardhat
# Shows progress every 15 seconds
# Displays detailed status every 30 seconds
# Automatically continues when ready
```

### Understanding Hardhat Startup
When forking mainnet, Hardhat must:
1. Connect to the Alchemy RPC endpoint
2. Fetch state from block 19000000
3. Build local state database
4. Initialize accounts and contracts

This process typically takes 2-3 minutes on first start, faster on subsequent starts.

## Troubleshooting

### Hardhat Node Issues

#### Slow to Start
**Issue:** Hardhat takes 2-3 minutes to start (forking mainnet)
**Solution:** This is normal. Use `make wait-for-hardhat` to check status:
```bash
make wait-for-hardhat
```

#### Deployment Timeouts
**Issue:** Contract deployment times out
**Solution:** Wait for hardhat to fully sync:
```bash
# Check if hardhat is ready
make test-hardhat

# If not ready, wait then retry
make wait-for-hardhat
make deploy-contracts
```

### Subgraph Issues

#### Not Syncing
**Issue:** "Subgraph has not started syncing yet"
**Solution:** 
1. Check contract is deployed: `make test-hardhat`
2. Redeploy everything: `make reset-all`
3. Generate test data (see above)

#### Already Exists Error
**Issue:** "Subgraph already exists"
**Solution:**
```bash
make remove-local
make deploy-subgraph
```

### Service Connection Issues

#### Graph Node Can't Connect to Hardhat
**Issue:** Graph node shows RPC timeout errors
**Solution:** Services use `host.docker.internal` to reach host ports. If this fails:
1. Check Docker Desktop is updated
2. Restart Docker Desktop
3. Use `make dev-clean` and start fresh

#### Port Already in Use
**Issue:** "Port already allocated"
**Solution:**
```bash
# Find and kill process using port (example for 8545)
lsof -i :8545
kill -9 <PID>

# Or just clean everything
make dev-clean
make dev-start
```

### Clean Restart Procedure
When things go wrong:
```bash
# 1. Stop everything
make dev-stop

# 2. Clean all data
make dev-clean

# 3. Start fresh
make dev-start

# 4. Deploy
make deploy-all
```

## Performance Tips

### M1 Optimization
1. **Increase Docker memory** to 12GB+ for best performance
2. **Keep containers running** between sessions (just use `make reset-all`)
3. **Use targeted resets** (`reset-contracts` vs `reset-all`)
4. **Monitor resources** with `docker stats`

### Faster Development
1. **Hardhat startup**: First start takes 2-3 minutes, subsequent starts are faster
2. **Parallel operations**: Graph node, IPFS, and PostgreSQL start while waiting for hardhat
3. **Persistent volumes**: Contract deployments and npm modules persist across restarts

## File Structure

```
thegraph/casino-slot-subgraph/
├── docker-compose.yml          # Service definitions (no networks!)
├── Makefile                    # All control commands
├── scripts/
│   ├── check-hardhat-health.sh # Comprehensive RPC health check
│   └── check-hardhat-quick.sh  # Quick port connectivity check
├── abis/                       # Contract ABIs (auto-updated)
├── build/                      # Compiled subgraph
├── generated/                  # Generated TypeScript
├── src/                        # Subgraph mappings
├── schema.graphql              # GraphQL schema
├── subgraph.yaml              # Subgraph manifest
├── networks.json              # Network configuration
├── DEVELOPER-WORKFLOW.md      # Detailed workflow guide
└── README-M1-SETUP.md         # This file
```

## Advanced Configuration

### Custom RPC Endpoint
To use a different RPC endpoint, modify hardhat's docker-compose service:
```yaml
command: bash -c "... && npx hardhat node --fork YOUR_RPC_URL"
```

### Graph Node Settings
Adjust in docker-compose.yml:
```yaml
environment:
  ETHEREUM_POLLING_INTERVAL: 500  # Faster polling
  GRAPH_LOG: info                 # Less verbose logging
```

### Using Real Networks
To deploy to Sepolia:
```bash
# Update addresses from Sepolia deployment
make update-addresses NETWORK=sepolia

# Deploy to Graph Studio
graph deploy --studio your-subgraph-name
```

## Support

For issues:
1. Check logs: `make logs-all`
2. Verify services: `make test-all-services`
3. Clean restart: `make dev-clean && make dev-start`
4. Check this guide's troubleshooting section

## Summary

This setup provides:
- **Full control** over deployment timing
- **All services on host ports** - no hidden networks
- **Easy reset** for rapid iteration
- **M1 optimized** with ARM64 containers
- **Clear commands** for every operation
- **Intelligent health checks** that show real readiness, not just port availability
- **Progressive feedback** during hardhat startup process

### Key Improvements
1. **Smart Service Checks**: `dev-start` shows immediate status of all services
2. **Detailed Health Monitoring**: `hardhat-status` tests actual RPC functionality
3. **Patient Waiting**: `wait-for-hardhat` shows progress while mainnet fork completes
4. **Clear Feedback**: No more guessing if services are ready - you get specific status

The architecture separates infrastructure (docker-compose) from deployment (make commands), giving developers full control while providing excellent visibility into service readiness.