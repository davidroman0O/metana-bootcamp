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
	forge compile
	forge script script/Deploy.s.sol:DeployScript \
		--rpc-url http://127.0.0.1:8545 \
		--broadcast \
		--unlocked \
		--sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
		-vvvv

	# Extract contract addresses (first tx is ERC1155Token, second tx is Forge)
	@echo "Extracting contract addresses..."
	@jq -r '.transactions[0].contractAddress' ./broadcast/Deploy.s.sol/31337/run-latest.json | awk '{print "export default \"" $$0 "\";"}' > ../web/src/config/anvil/token.ts
	@jq -r '.transactions[1].contractAddress' ./broadcast/Deploy.s.sol/31337/run-latest.json | awk '{print "export default \"" $$0 "\";"}' > ../web/src/config/anvil/forge.ts

	# Export Forge ABI as TypeScript (single line)
	@echo "Exporting ABIs..."
	@abi_forge=$$(jq -c '.abi' ./out/forge.sol/Forge.json); echo "export default $$abi_forge as const;" > ../web/src/hooks/abi/Forge.ts

	# Export ERC1155Token ABI as TypeScript (single line)
	@abi_erc1155=$$(jq -c '.abi' ./out/erc1155.sol/ERC1155Token.json); echo "export default $$abi_erc1155 as const;" > ../web/src/hooks/abi/ERC1155Token.ts

	@echo "Deployment completed successfully!"
	@echo "Contract addresses and ABIs have been updated."

# Clean Build Artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	forge clean

# Reset Environment (Clean + Redeploy)
.PHONY: reset
reset: clean deploy
