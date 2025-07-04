# Casino Slot Subgraph Makefile
# Automates common development tasks

.PHONY: help update-abi codegen build deploy-local create-local clean

# Default target
help:
	@echo "Available commands:"
	@echo "  update-abi     - Copy latest ABI from Hardhat artifacts"
	@echo "  codegen        - Generate TypeScript types from ABI and schema"
	@echo "  build          - Build the subgraph"
	@echo "  rebuild        - Update ABI, codegen, and build in one command"
	@echo "  deploy-local   - Deploy to local Graph node"
	@echo "  create-local   - Create subgraph on local Graph node"
	@echo "  remove-local   - Remove subgraph from local Graph node"
	@echo "  clean          - Clean generated files"
	@echo "  logs           - Show local Graph node logs"
	@echo "  start-node     - Start local Graph node with Docker"
	@echo "  stop-node      - Stop local Graph node"

# Paths
HARDHAT_ARTIFACTS = ../../hardhat/artifacts/contracts/CasinoSlot.sol/CasinoSlot.json
ABI_DESTINATION = ./abis/CasinoSlot.json
SUBGRAPH_NAME = casino-slot-subgraph

# Update ABI from Hardhat artifacts
update-abi:
	@echo "📋 Copying latest ABI from Hardhat artifacts..."
	@if [ ! -f $(HARDHAT_ARTIFACTS) ]; then \
		echo "❌ ABI file not found. Please compile your Hardhat project first:"; \
		echo "   cd ../../hardhat && npx hardhat compile"; \
		exit 1; \
	fi
	@cp $(HARDHAT_ARTIFACTS) $(ABI_DESTINATION)
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

# Complete rebuild process
rebuild: update-abi codegen build
	@echo "🚀 Subgraph rebuild completed!"

# Local deployment commands
create-local:
	@echo "📦 Creating subgraph on local node..."
	@graph create --node http://localhost:8020/ $(SUBGRAPH_NAME)

deploy-local:
	@echo "🚀 Deploying to local Graph node..."
	@graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 $(SUBGRAPH_NAME)

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

# Development workflow shortcuts
dev: start-node create-local rebuild deploy-local
	@echo "🎉 Development environment ready!"
	@echo "   - Graph node: http://localhost:8000"
	@echo "   - GraphiQL: http://localhost:8000/subgraphs/name/$(SUBGRAPH_NAME)/graphql"

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