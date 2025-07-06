# Casino Slot Subgraph Makefile
# Automates common development tasks for M1 MacBook Pro

.PHONY: help update-abi codegen build deploy-local create-local clean setup-m1 build-m1 dev-full

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "🍎 M1 MacBook Pro Setup:"
	@echo "  setup-m1       - One-time M1 setup (build graph-node, check Docker)"
	@echo "  build-m1       - Build M1-compatible graph-node image"
	@echo "  dev-full       - Start complete development environment"
	@echo "  refresh-all    - Refresh contracts and subgraph"
	@echo "  watch-dev      - Watch files and auto-refresh on changes"
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
	@echo "🚀 Local Development:"
	@echo "  start-node     - Start local Graph node with Docker"
	@echo "  create-local   - Create subgraph on local Graph node"
	@echo "  deploy-local   - Deploy to local Graph node"
	@echo "  dev            - Complete dev setup (start node + deploy)"
	@echo "  smart-dev      - Quick localhost development deployment"
	@echo ""
	@echo "🛠️  Utilities:"
	@echo "  clean          - Clean generated files"
	@echo "  logs           - Show local Graph node logs"
	@echo "  stop-node      - Stop local Graph node"
	@echo "  remove-local   - Remove subgraph from local Graph node"
	@echo "  check-config   - Check current configuration"
	@echo ""
	@echo "🔍 Debugging Commands:"
	@echo "  logs-all       - Show logs for all services"
	@echo "  logs-hardhat   - Show Hardhat node logs"
	@echo "  logs-graph     - Show Graph node logs"
	@echo "  test-all-services - Test all service connections"
	@echo "  debug-containers - Show container status and resource usage"
	@echo "  start-individual - Start services one by one for debugging"
	@echo "  clean-all      - Clean everything (containers, volumes, data)"
	@echo "  clean-npm      - Clean npm cache only (when npm issues occur)"

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
	sed -i.bak "s/address: \"0x[a-fA-F0-9]*\"/address: \"$$CONTRACT_ADDRESS\"/g" subgraph.yaml; \
	sed -i.bak "s/network: .*/network: $(NETWORK)/g" subgraph.yaml; \
	rm -f subgraph.yaml.bak; \
	echo "✅ Contract address updated to $$CONTRACT_ADDRESS"

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

# Development workflow shortcuts
dev: start-node create-local smart-rebuild deploy-local
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

dev-full:
	@echo "🚀 Starting complete development environment..."
	@echo "This will start: Hardhat node, Graph node, IPFS, PostgreSQL, and development utilities"
	@docker-compose up -d
	@echo "⏳ Waiting for services to start..."
	@echo "⏳ This may take 2-3 minutes on first run (installing dependencies)..."
	@sleep 60
	@echo "🎉 Development environment ready!"
	@echo "   - Hardhat Node: http://localhost:8545"
	@echo "   - Graph Node: http://localhost:8000"
	@echo "   - GraphiQL: http://localhost:8000/subgraphs/name/$(SUBGRAPH_NAME)/graphql"
	@echo "   - Graph Admin: http://localhost:8020"
	@echo "   - IPFS: http://localhost:5001"
	@echo ""
	@echo "🔄 Next steps:"
	@echo "  1. Deploy contracts: make refresh-all"
	@echo "  2. Access GraphiQL for queries"

refresh-all:
	@echo "🔄 Refreshing contracts and subgraph..."
	@echo "1️⃣ Compiling and deploying contracts on host machine..."
	@cd ../../hardhat && npm run compile
	@cd ../../hardhat && npm run deploy:local
	@echo "2️⃣ Updating subgraph with new contract address..."
	@make update-addresses NETWORK=localhost
	@echo "3️⃣ Rebuilding subgraph..."
	@make smart-rebuild
	@echo "4️⃣ Deploying subgraph..."
	@make deploy-local
	@echo "✅ Refresh completed!"

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
	@echo -n "  Hardhat Node: "
	@curl -s http://localhost:8545 > /dev/null && echo "✅ Running" || echo "❌ Down"
	@echo -n "  Graph Node: "
	@curl -s http://localhost:8000 > /dev/null && echo "✅ Running" || echo "❌ Down"
	@echo -n "  IPFS: "
	@curl -s http://localhost:5001 > /dev/null && echo "✅ Running" || echo "❌ Down"
	@echo -n "  PostgreSQL: "
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
	@echo "🧪 Testing Hardhat node connection..."
	@curl -X POST -H "Content-Type: application/json" \
		--data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
		http://localhost:8545 && echo "\n✅ Hardhat node is responding" || echo "\n❌ Hardhat node is not responding"

test-graph:
	@echo "🧪 Testing Graph node connection..."
	@curl -f http://localhost:8000 > /dev/null && echo "✅ Graph node is responding" || echo "❌ Graph node is not responding"

test-ipfs:
	@echo "🧪 Testing IPFS connection..."
	@curl -X POST http://localhost:5001/api/v0/version > /dev/null 2>&1 && echo "✅ IPFS is responding" || echo "❌ IPFS is not responding"

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

clean-all:
	@echo "🧹 Cleaning up everything..."
	@docker-compose down --volumes --remove-orphans
	@docker system prune -f
	@rm -rf data/postgres/* data/ipfs/* 2>/dev/null || true
	@echo "✅ Cleanup completed"

clean-npm:
	@echo "🧹 Cleaning npm cache and node_modules..."
	@docker-compose down hardhat-node
	@docker volume rm casino-slot-subgraph_hardhat-node-modules 2>/dev/null || true
	@echo "✅ npm cache cleaned. Run 'make dev-full' to rebuild" 