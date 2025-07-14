# Developer Workflow Guide

How i've setup my devloper environment.

## Architecture Overview

- All services run in Docker containers but are exposed to the host
- Services communicate via `localhost` (no hidden Docker networks)
- Developer has full control over deployment timing
- Easy reset and redeploy for rapid iteration

## Quick Start

### 1. Start Infrastructure
```bash
make dev-start
```
This starts:
- Hardhat node (forked mainnet) on port 8545
- Graph node on ports 8000, 8020, 8030, 8040
- IPFS on port 5001
- PostgreSQL on port 5432

### 2. Deploy Everything
```bash
make deploy-all
```
This will:
1. Compile and deploy smart contracts to hardhat
2. Fund contract with ETH (if script exists)
3. Update subgraph with contract address
4. Build and deploy subgraph to graph-node

### 3. Access GraphiQL
Open http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql

## Common Workflows

### Making Contract Changes
1. Edit contract in `/hardhat/contracts/`
2. Run `make reset-contracts` to redeploy
3. Subgraph will automatically pick up new address

### Making Subgraph Changes
1. Edit schema or mappings
2. Run `make reset-subgraph` to rebuild and redeploy

### Complete Reset (Contract + Subgraph)
```bash
make reset-all
```

### Clean Start
```bash
make dev-clean  # Wipes everything
make dev-start  # Start fresh
make deploy-all # Deploy everything
```

## Individual Commands

### Infrastructure
- `make dev-start` - Start all Docker containers
- `make dev-stop` - Stop all containers
- `make dev-clean` - Remove containers and volumes

### Deployment
- `make deploy-contracts` - Deploy smart contracts only
- `make fund-contract` - Fund contract with ETH
- `make deploy-subgraph` - Deploy subgraph only

### Reset
- `make reset-contracts` - Redeploy contracts
- `make reset-subgraph` - Remove and redeploy subgraph
- `make reset-all` - Complete reset

### Debugging
- `make logs-all` - View all container logs
- `make logs-hardhat` - View hardhat logs only
- `make logs-graph` - View graph-node logs only
- `make test-all-services` - Test service connectivity

## Service URLs

- **Hardhat RPC**: http://localhost:8545
- **GraphiQL**: http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql
- **Graph Node Status**: http://localhost:8000
- **Graph Admin**: http://localhost:8020
- **IPFS**: http://localhost:5001
- **PostgreSQL**: localhost:5432 (user: graph-node, pass: let-me-in)

## Troubleshooting

### Subgraph Not Syncing
1. Check if contracts are deployed: `make test-hardhat`
2. Check contract exists at address: Look at deployment file
3. Redeploy: `make reset-all`

### Port Conflicts
If ports are already in use, stop conflicting services or modify `docker-compose.yml`

### Clean Slate
```bash
make dev-clean
docker system prune -f
```
