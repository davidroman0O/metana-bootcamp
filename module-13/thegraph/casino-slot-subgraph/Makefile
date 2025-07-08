# Casino Slot Subgraph Makefile
# Automates common development tasks for M1 MacBook Pro

.PHONY: help update-abi codegen build deploy-local create-local clean setup-m1 build-m1 dev-full dev-start dev-stop dev-clean deploy-contracts fund-contract deploy-subgraph deploy-all reset-contracts reset-subgraph reset-all wait-for-hardhat hardhat-status

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "🚀 Developer Workflow (Recommended):"
	@echo "  dev-start      - Start infrastructure (Docker containers)"
	@echo "  wait-for-hardhat - Wait for hardhat node to be ready"
	@echo "  deploy-all     - Deploy contracts and subgraph (includes wait)"
	@echo "  reset-all      - Redeploy everything (contracts + subgraph)"
	@echo "  dev-stop       - Stop infrastructure"
	@echo "  dev-clean      - Clean everything for fresh start"
	@echo ""
	@echo "📦 Deployment Control:"
	@echo "  deploy-contracts - Deploy smart contracts to hardhat"
	@echo "  fund-contract    - Send ETH to contract for VRF"
	@echo "  deploy-subgraph  - Deploy subgraph to graph-node"
	@echo "  reset-contracts  - Redeploy contracts only"
	@echo "  reset-subgraph   - Remove and redeploy subgraph"
	@echo ""
	@echo "🎮 Script Running:"
	@echo "  Scripts now work directly without special handling"
	@echo "  Just run: cd ../../hardhat && npm run <script-name>"
	@echo "  Examples: npm run vrf:fulfiller, npm run test:multi-player"
	@echo ""
	@echo "📋 Core Commands:"
	@echo "  update-abi     - Auto-compile Hardhat & copy latest ABI"
	@echo "  codegen        - Generate TypeScript types from ABI and schema"
	@echo "  build          - Build the subgraph"
	@echo "  rebuild        - Update ABI, codegen, and build (legacy)"
	@echo "  smart-rebuild  - Smart rebuild with deployment integration"
	@echo ""
	@echo "🌐 Network Management:"
	@echo "  update-addresses NETWORK=localhost|sepolia - Update contract addresses from deployments"
	@echo "  update-networks - Update networks.json from all deployment files"
	@echo "  switch-network NETWORK=localhost|sepolia - Switch target network"
	@echo "  deploy-to NETWORK=localhost|sepolia - Deploy to specific network"
	@echo ""
	@echo "🛠️  Utilities:"
	@echo "  clean          - Clean generated files"
	@echo "  logs           - Show local Graph node logs"
	@echo "  remove-local   - Remove subgraph from local Graph node"
	@echo "  check-config   - Check current configuration"
	@echo ""
	@echo "🔍 Debugging Commands:"
	@echo "  logs-all       - Show logs for all services"
	@echo "  logs-hardhat   - Show Hardhat node logs"
	@echo "  logs-graph     - Show Graph node logs"
	@echo "  test-all-services - Test all service connections"
	@echo "  debug-containers - Show container status and resource usage"
	@echo "  hardhat-status - Detailed hardhat node health check"
	@echo ""
	@echo "🍎 M1 MacBook Pro Setup:"
	@echo "  setup-m1       - One-time M1 setup (build graph-node, check Docker)"
	@echo "  build-m1       - Build M1-compatible graph-node image"

# Paths
HARDHAT_ARTIFACTS = ../../hardhat/artifacts/contracts/CasinoSlot.sol/CasinoSlot.json
ABI_DESTINATION = ./abis/CasinoSlot.json
SUBGRAPH_NAME = casino-slot-subgraph

# Update ABI from Hardhat artifacts with auto-compilation
update-abi:
	@echo "📋 Updating ABI from Hardhat artifacts..."
	@echo "🔨 Auto-compiling Hardhat contracts..."
	@cd ../../hardhat && npm run compile
	@if [ ! -f $(HARDHAT_ARTIFACTS) ]; then \
		echo "❌ ABI file not found after compilation: $(HARDHAT_ARTIFACTS)"; \
		echo "💡 Checking for CasinoSlotTest..."; \
		if [ -f ../../hardhat/artifacts/contracts/CasinoSlotTest.sol/CasinoSlotTest.json ]; then \
			echo "✅ Found CasinoSlotTest, using that instead"; \
			cp ../../hardhat/artifacts/contracts/CasinoSlotTest.sol/CasinoSlotTest.json $(ABI_DESTINATION); \
		else \
			echo "❌ Neither CasinoSlot nor CasinoSlotTest ABI found"; \
			exit 1; \
		fi \
	else \
		cp $(HARDHAT_ARTIFACTS) $(ABI_DESTINATION); \
	fi
	@echo "✅ ABI updated successfully"

# Generate TypeScript types
codegen:
	@echo "🔄 Generating TypeScript types..."
	@yarn codegen
	@echo "✅ Codegen completed"

# Build subgraph
build:
	@echo "🔨 Building subgraph..."
	@yarn build
	@echo "✅ Build completed"

# Update contract addresses from deployment files
update-addresses:
	@echo "📝 Updating contract addresses from deployment files..."
	@if [ -z "$(NETWORK)" ]; then \
		echo "❌ Please specify network: make update-addresses NETWORK=localhost|sepolia"; \
		exit 1; \
	fi
	@if [ "$(NETWORK)" = "localhost" ]; then \
		DEPLOYMENT_FILE="../../hardhat/deployments/deployment-31337.json"; \
		CHAIN_ID="31337"; \
	elif [ "$(NETWORK)" = "sepolia" ]; then \
		DEPLOYMENT_FILE="../../hardhat/deployments/deployment-11155111.json"; \
		CHAIN_ID="11155111"; \
	else \
		echo "❌ Unsupported network: $(NETWORK)"; \
		exit 1; \
	fi; \
	if [ ! -f "$$DEPLOYMENT_FILE" ]; then \
		echo "❌ Deployment file not found: $$DEPLOYMENT_FILE"; \
		exit 1; \
	fi; \
	CONTRACT_ADDRESS=$$(cat "$$DEPLOYMENT_FILE" | grep -A 10 '"contracts"' | grep -E '"proxy"|"address"' | head -1 | cut -d'"' -f4); \
	if [ -z "$$CONTRACT_ADDRESS" ]; then \
		echo "❌ Could not extract contract address from deployment file"; \
		exit 1; \
	fi; \
	echo "🎯 Found contract address: $$CONTRACT_ADDRESS for $(NETWORK)"; \
	DEPLOYMENT_BLOCK=$$(cat "$$DEPLOYMENT_FILE" | grep -E '"deploymentBlock"' | head -1 | sed 's/[^0-9]//g'); \
	if [ -z "$$DEPLOYMENT_BLOCK" ]; then \
		echo "⚠️  No deployment block found, using 0"; \
		DEPLOYMENT_BLOCK="0"; \
	else \
		echo "📦 Found deployment block: $$DEPLOYMENT_BLOCK"; \
	fi; \
	sed -i.bak "s/address: \"0x[a-fA-F0-9]*\"/address: \"$$CONTRACT_ADDRESS\"/g" subgraph.yaml; \
	sed -i.bak "s/network: .*/network: $(NETWORK)/g" subgraph.yaml; \
	sed -i.bak "s/startBlock: [0-9]*/startBlock: $$DEPLOYMENT_BLOCK/g" subgraph.yaml; \
	rm -f subgraph.yaml.bak; \
	echo "✅ Contract address updated to $$CONTRACT_ADDRESS"; \
	echo "✅ Start block updated to $$DEPLOYMENT_BLOCK"

# Update networks.json from deployment files
update-networks:
	@echo "🌐 Updating networks.json from deployment files..."
	@echo '{' > networks.json
	@if [ -f "../../hardhat/deployments/deployment-31337.json" ]; then \
		CONTRACT_ADDRESS=$$(cat "../../hardhat/deployments/deployment-31337.json" | grep -A 10 '"contracts"' | grep -E '"proxy"|"address"' | head -1 | cut -d'"' -f4); \
		echo '  "localhost": {' >> networks.json; \
		echo '    "CasinoSlot": {' >> networks.json; \
		echo "      \"address\": \"$$CONTRACT_ADDRESS\"," >> networks.json; \
		echo '      "startBlock": 0' >> networks.json; \
		echo '    }' >> networks.json; \
		echo '  }' >> networks.json; \
	fi
	@if [ -f "../../hardhat/deployments/deployment-11155111.json" ]; then \
		CONTRACT_ADDRESS=$$(cat "../../hardhat/deployments/deployment-11155111.json" | grep -A 10 '"contracts"' | grep -E '"proxy"|"address"' | head -1 | cut -d'"' -f4); \
		if [ -f "../../hardhat/deployments/deployment-31337.json" ]; then \
			echo ',' >> networks.json; \
		fi; \
		echo '  "sepolia": {' >> networks.json; \
		echo '    "CasinoSlot": {' >> networks.json; \
		echo "      \"address\": \"$$CONTRACT_ADDRESS\"," >> networks.json; \
		echo '      "startBlock": 0' >> networks.json; \
		echo '    }' >> networks.json; \
		echo '  }' >> networks.json; \
	fi
	@echo ',' >> networks.json
	@echo '  "mainnet": {' >> networks.json
	@echo '    "CasinoSlot": {' >> networks.json
	@echo '      "address": "0x0000000000000000000000000000000000000000",' >> networks.json
	@echo '      "startBlock": 0' >> networks.json
	@echo '    }' >> networks.json
	@echo '  }' >> networks.json
	@echo '}' >> networks.json
	@echo "✅ networks.json updated with localhost, sepolia, and mainnet"

# Smart rebuild with deployment integration
smart-rebuild: update-abi update-networks codegen build
	@echo "🚀 Smart subgraph rebuild completed!"

# Complete rebuild process (legacy)
rebuild: update-abi codegen build
	@echo "🚀 Subgraph rebuild completed!"

# Local deployment commands
create-local:
	@echo "📦 Creating subgraph on local node..."
	@graph create --node http://localhost:8020/ $(SUBGRAPH_NAME)

deploy-local:
	@echo "🚀 Deploying to local Graph node..."
	@graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 --version-label v1.0.0 $(SUBGRAPH_NAME)

remove-local:
	@echo "🗑️  Removing subgraph from local node..."
	@graph remove --node http://localhost:8020/ $(SUBGRAPH_NAME)

# Docker management for local Graph node
start-node:
	@echo "🐳 Starting local Graph node..."
	@docker-compose up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo "✅ Graph node should be running at http://localhost:8000"

stop-node:
	@echo "🛑 Stopping local Graph node..."
	@docker-compose down

logs:
	@echo "📋 Showing Graph node logs..."
	@docker-compose logs -f graph-node

# Clean generated files
clean:
	@echo "🧹 Cleaning generated files..."
	@rm -rf generated/
	@rm -rf build/
	@echo "✅ Cleanup completed"

# Quick iteration commands for rapid development
quick-update:
	@echo "⚡ Quick contract update (keeping fork alive)..."
	@echo "   1️⃣ Deploying new contracts..."
	@cd ../../hardhat && npm run deploy:local
	@echo "   2️⃣ Updating subgraph configuration..."
	@make update-addresses NETWORK=localhost
	@echo "   3️⃣ Rebuilding subgraph..."
	@make smart-rebuild
	@echo "   4️⃣ Deploying subgraph..."
	@make remove-local 2>/dev/null || true
	@make create-local 2>/dev/null || true
	@make deploy-local
	@echo "✅ Quick update completed!"

quick-sync:
	@echo "⚡ Quick subgraph sync (from current block)..."
	@make update-addresses NETWORK=localhost
	@make smart-rebuild
	@make deploy-local
	@echo "✅ Quick sync completed!"

preserve-fork:
	@echo "🔧 Keeping hardhat fork running while updating..."
	@echo "   ⚠️  DO NOT stop docker-compose!"
	@echo "   Use 'make quick-update' for contract changes"
	@echo "   Use 'make quick-sync' for subgraph changes"

# Network switching and deployment
switch-network:
	@if [ -z "$(NETWORK)" ]; then \
		echo "❌ Please specify network: make switch-network NETWORK=localhost|sepolia"; \
		exit 1; \
	fi
	@make update-addresses NETWORK=$(NETWORK)
	@echo "🔄 Switched to $(NETWORK) network"

deploy-to:
	@if [ -z "$(NETWORK)" ]; then \
		echo "❌ Please specify network: make deploy-to NETWORK=localhost|sepolia"; \
		exit 1; \
	fi
	@make switch-network NETWORK=$(NETWORK)
	@make smart-rebuild
	@if [ "$(NETWORK)" = "localhost" ]; then \
		make deploy-local; \
	else \
		echo "🚀 Ready for $(NETWORK) deployment. Run: graph deploy --studio casino-slot-subgraph"; \
	fi

# Infrastructure Management Commands
dev-start:
	@echo "🚀 Starting essential development services (without graph-node)..."
	@docker-compose up -d hardhat-node ipfs postgres
	@echo ""
	@echo "⏳ Waiting for basic services to start..."
	@sleep 10
	@echo ""
	@echo "🧪 Testing service availability:"
	@printf "   PostgreSQL: " && (docker-compose exec -T postgres pg_isready -h localhost -U graph-node > /dev/null 2>&1 && echo "✅ Ready" || echo "❌ Not ready")
	@printf "   IPFS: " && (curl -s --max-time 2 -X POST http://localhost:5001/api/v0/version > /dev/null 2>&1 && echo "✅ Ready" || echo "❌ Not ready")
	@printf "   Graph Node: " && echo "⏳ Will start after contracts are deployed"
	@printf "   Hardhat Node: " && (./scripts/check-hardhat-quick.sh > /dev/null 2>&1 && echo "⏳ Starting (forking mainnet...)" || echo "❌ Not started")
	@echo ""
	@echo "📍 Service URLs:"
	@echo "   - Hardhat Node: http://localhost:8545"
	@echo "   - Graph Node: http://localhost:8000 (will be available after deployment)"
	@echo "   - GraphiQL: http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql"
	@echo "   - IPFS: http://localhost:5001"
	@echo "   - PostgreSQL: localhost:5432"
	@echo ""
	@echo "💡 Next steps:"
	@echo "   - Contracts will be deployed automatically if you ran 'make dev'"
	@echo "   - Otherwise, run 'make deploy-all' to deploy contracts and subgraph"
	@echo "   - Graph Node will start automatically after contracts are deployed"

dev-start-all:
	@echo "⚠️  WARNING: Starting all services including graph-node"
	@echo "   Graph-node may flood hardhat with requests and make it unresponsive!"
	@echo "   Use 'make dev-start' instead for the recommended workflow."
	@echo ""
	@echo "🚀 Starting ALL development services..."
	@docker-compose up -d
	@echo ""
	@echo "⏳ Waiting for services to start..."
	@sleep 10
	@echo "✅ All services started (graph-node may be flooding hardhat)"

dev-stop:
	@echo "🛑 Stopping development infrastructure..."
	@docker-compose down
	@echo "✅ Infrastructure stopped"

wait-for-hardhat:
	@echo "⏳ Waiting for Hardhat node to be ready..."
	@echo "   This can take 2-3 minutes as it forks mainnet at block 19000000..."
	@count=0; \
	while ! ./scripts/check-hardhat-health.sh > /dev/null 2>&1; do \
		count=$$((count + 1)); \
		if [ $$((count % 15)) -eq 0 ]; then \
			echo "   Still waiting... ($$count seconds)"; \
			if [ $$((count % 30)) -eq 0 ]; then \
				echo "   Checking status..."; \
				./scripts/check-hardhat-health.sh 2>/dev/null || true; \
			fi; \
		fi; \
		sleep 1; \
	done
	@echo ""
	@./scripts/check-hardhat-health.sh
	@echo ""
	@echo "🎉 Hardhat node is ready for deployments!"

hardhat-status:
	@echo "📊 Hardhat Node Status:"
	@echo ""
	@./scripts/check-hardhat-health.sh || echo -e "\n❌ Hardhat node is not fully ready yet"

dev-clean:
	@echo "🧹 Cleaning development environment..."
	@docker-compose down -v --remove-orphans
	@rm -rf data/postgres/* data/ipfs/* 2>/dev/null || true
	@echo "✅ Environment cleaned"

# Deployment Control Commands
deploy-contracts:
	@echo "📦 Deploying contracts to local hardhat node..."
	@cd ../../hardhat && npm run compile
	@cd ../../hardhat && npm run deploy:local
	@echo "✅ Contracts deployed"

fund-contract:
	@echo "💰 Funding contract with ETH for VRF..."
	@cd ../../hardhat && npx hardhat run scripts/fund-contract.js --network localhost 2>/dev/null || echo "Note: Contract funding script not found, skipping..."
	@echo "✅ Contract funding complete"

deploy-subgraph:
	@echo "📊 Deploying subgraph..."
	@make update-addresses NETWORK=localhost
	@make smart-rebuild
	@make create-local 2>/dev/null || true
	@make deploy-local
	@echo "✅ Subgraph deployed"
	@echo "   - GraphiQL: http://localhost:8000/subgraphs/name/$(SUBGRAPH_NAME)/graphql"

deploy-all:
	@echo "🚀 Starting full deployment (with graph-node management)..."
	@./scripts/deploy-all.sh

# Reset Commands
reset-contracts:
	@echo "🔄 Resetting contracts..."
	@make deploy-contracts
	@make fund-contract
	@echo "✅ Contracts reset"

reset-subgraph:
	@echo "🔄 Resetting subgraph..."
	@make remove-local 2>/dev/null || true
	@make deploy-subgraph
	@echo "✅ Subgraph reset"

reset-all:
	@echo "🔄 Resetting entire deployment..."
	@make reset-contracts
	@make reset-subgraph
	@echo "✅ Full reset completed!"

# Note: Graph-node no longer needs to be paused for scripts
# The compatibility issue has been fixed with environment variables

# Development workflow shortcuts
dev: dev-start deploy-all
	@echo "🎉 Development environment ready!"
	@echo "   - Graph node: http://localhost:8000"
	@echo "   - GraphiQL: http://localhost:8000/subgraphs/name/$(SUBGRAPH_NAME)/graphql"

smart-dev: update-addresses NETWORK=localhost smart-rebuild deploy-local
	@echo "⚡ Smart development deployment completed!"

quick-deploy: rebuild deploy-local
	@echo "⚡ Quick deployment completed!"

# Check if contract address needs updating
check-config:
	@echo "🔍 Checking configuration..."
	@echo "Contract address in subgraph.yaml:"
	@grep -A 1 "address:" subgraph.yaml | tail -1
	@echo "Contract address in networks.json:"
	@grep -A 2 "localhost" networks.json | grep "address" | head -1

# Update contract address (requires ADDRESS parameter)
update-address:
	@if [ -z "$(ADDRESS)" ]; then \
		echo "❌ Please provide contract address: make update-address ADDRESS=0x123..."; \
		exit 1; \
	fi
	@echo "📝 Updating contract address to $(ADDRESS)..."
	@sed -i.bak 's/"address": "0x[a-fA-F0-9]*"/"address": "$(ADDRESS)"/g' subgraph.yaml
	@sed -i.bak 's/"address": "0x[a-fA-F0-9]*"/"address": "$(ADDRESS)"/g' networks.json
	@rm -f subgraph.yaml.bak networks.json.bak
	@echo "✅ Contract address updated"

# Complete redeploy with new contract address
redeploy:
	@if [ -z "$(ADDRESS)" ]; then \
		echo "❌ Please provide contract address: make redeploy ADDRESS=0x123..."; \
		exit 1; \
	fi
	@make update-address ADDRESS=$(ADDRESS)
	@make rebuild
	@make deploy-local
	@echo "🎉 Redeploy completed with new address!"

# M1 MacBook Pro specific commands
setup-m1:
	@echo "🍎 Setting up M1 MacBook Pro development environment..."
	@./scripts/setup-m1-env.sh

build-m1:
	@echo "🏗️  Building M1-compatible graph-node image..."
	@if [ ! -d "../graph-node-master" ]; then \
		echo "❌ Graph Node source directory not found: ../graph-node-master"; \
		exit 1; \
	fi
	@cd ../graph-node-master && \
	docker rmi graphprotocol/graph-node:latest 2>/dev/null || true && \
	./docker/build.sh && \
	docker tag graph-node graphprotocol/graph-node:latest
	@echo "✅ M1 graph-node image built successfully"

dev-full: dev-start
	@echo "✅ Use 'make deploy-all' to deploy contracts and subgraph"

refresh-all: reset-all
	@echo "✅ Refresh completed! (using reset-all)"

refresh-contracts:
	@echo "🔄 Refreshing contracts only..."
	@cd ../../hardhat && npm run compile
	@cd ../../hardhat && npm run deploy:local
	@make update-addresses NETWORK=localhost
	@echo "✅ Contracts refreshed!"

refresh-subgraph:
	@echo "🔄 Refreshing subgraph only..."
	@make smart-rebuild
	@make deploy-local
	@echo "✅ Subgraph refreshed!"

watch-dev:
	@echo "👀 Starting file watcher for development..."
	@echo "This will watch for changes in:"
	@echo "  - Smart contracts (../../hardhat/contracts/)"
	@echo "  - Subgraph schema (./schema.graphql)"
	@echo "  - Subgraph handlers (./src/)"
	@./scripts/watch-files.sh

dev-status:
	@echo "📊 Development environment status:"
	@echo ""
	@echo "🐳 Docker containers:"
	@docker-compose ps
	@echo ""
	@echo "🌐 Service health:"
	@printf "  Hardhat Node: "
	@curl -s http://localhost:8545 > /dev/null && echo "✅ Running" || echo "❌ Down"
	@printf "  Graph Node: "
	@curl -s http://localhost:8000 > /dev/null && echo "✅ Running" || echo "❌ Down"
	@printf "  IPFS: "
	@curl -s http://localhost:5001 > /dev/null && echo "✅ Running" || echo "❌ Down"
	@printf "  PostgreSQL: "
	@docker-compose exec -T postgres pg_isready -h localhost -U graph-node > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Down"

stop-all:
	@echo "🛑 Stopping all services..."
	@docker-compose down
	@echo "✅ All services stopped"

restart-all:
	@echo "🔄 Restarting all services..."
	@docker-compose down
	@docker-compose up -d
	@echo "✅ All services restarted"

# Enhanced debugging commands
logs-all:
	@echo "📋 Showing logs for all services..."
	@docker-compose logs -f

logs-hardhat:
	@echo "📋 Showing Hardhat node logs..."
	@docker-compose logs -f hardhat-node

logs-graph:
	@echo "📋 Showing Graph node logs..."
	@docker-compose logs -f graph-node

logs-ipfs:
	@echo "📋 Showing IPFS logs..."
	@docker-compose logs -f ipfs

logs-postgres:
	@echo "📋 Showing PostgreSQL logs..."
	@docker-compose logs -f postgres

logs-dev:
	@echo "📋 Showing development utilities logs..."
	@docker-compose logs -f subgraph-dev

test-hardhat:
	@echo "🧪 Testing Hardhat node health..."
	@./scripts/check-hardhat-health.sh || true

test-graph:
	@echo "🧪 Testing Graph node connection..."
	@curl -s --max-time 5 -f http://localhost:8000 > /dev/null 2>&1 && echo "✅ Graph node is responding" || echo "❌ Graph node is not responding"

test-ipfs:
	@echo "🧪 Testing IPFS connection..."
	@curl -s --max-time 5 -X POST http://localhost:5001/api/v0/version > /dev/null 2>&1 && echo "✅ IPFS is responding" || echo "❌ IPFS is not responding"

test-postgres:
	@echo "🧪 Testing PostgreSQL connection..."
	@docker-compose exec -T postgres pg_isready -h localhost -U graph-node > /dev/null && echo "✅ PostgreSQL is responding" || echo "❌ PostgreSQL is not responding"

test-all-services:
	@echo "🧪 Testing all services..."
	@make test-hardhat
	@make test-graph
	@make test-ipfs
	@make test-postgres

debug-containers:
	@echo "🔍 Container status and resource usage:"
	@docker-compose ps
	@echo ""
	@echo "📊 Resource usage:"
	@docker stats --no-stream

debug-hardhat-shell:
	@echo "🐚 Opening shell in hardhat container..."
	@docker-compose exec hardhat-node bash

debug-graph-shell:
	@echo "🐚 Opening shell in graph-node container..."
	@docker-compose exec graph-node bash

start-individual:
	@echo "🚀 Starting services individually for debugging..."
	@echo "1️⃣ Starting PostgreSQL..."
	@docker-compose up -d postgres
	@sleep 10
	@echo "2️⃣ Starting IPFS..."
	@docker-compose up -d ipfs
	@sleep 10
	@echo "3️⃣ Starting Hardhat node..."
	@docker-compose up -d hardhat-node
	@sleep 60
	@echo "4️⃣ Starting Graph node..."
	@docker-compose up -d graph-node
	@sleep 20
	@echo "5️⃣ Starting development utilities..."
	@docker-compose up -d subgraph-dev
	@echo "✅ All services started individually"

clean-all: dev-clean
	@docker system prune -f
	@echo "✅ Deep cleanup completed"

clean-npm:
	@echo "🧹 Cleaning npm cache and node_modules..."
	@docker-compose down hardhat-node
	@docker volume rm casino-slot-subgraph_hardhat-node-modules 2>/dev/null || true
	@echo "✅ npm cache cleaned. Run 'make dev-full' to rebuild" 