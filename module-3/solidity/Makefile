# Variables
DEPLOY_SCRIPT := script/Deploy.s.sol
CONTRACT := src/forge.sol:Forge
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
	forge build
	forge create $(CONTRACT) --unlocked --from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --broadcast

# forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast --unlocked --froms 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 -vvvv
# forge script $(DEPLOY_SCRIPT) --broadcast -vvvv

# Clean Build Artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	forge clean

# Reset Environment (Clean + Redeploy)
.PHONY: reset
reset: clean deploy
