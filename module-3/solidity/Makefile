# Variables
DEPLOY_SCRIPT := script/Deploy.s.sol
RPC_URL := http://127.0.0.1:8545

# Default target
.PHONY: all
all: deploy

# Start Anvil (runs in the foreground)
.PHONY: anvil
anvil:
	@echo "Starting Anvil... (Press Ctrl+C to stop)"
	anvil -vvvv

# Deploy Contracts (requires Anvil to be running)
.PHONY: deploy
deploy:
	@echo "Deploying contracts..."
	forge script $(DEPLOY_SCRIPT) --broadcast -vvvv

# Clean Build Artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	forge clean

# Reset Environment (Clean + Redeploy)
.PHONY: reset
reset: clean deploy
