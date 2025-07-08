#!/bin/bash

# Get current block number from hardhat node
# Useful for manually setting startBlock in subgraph.yaml

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Getting current block number from Hardhat node..."

# Check if hardhat is running
if ! curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}❌ Hardhat node is not responding on localhost:8545${NC}"
    echo "   Please ensure it's running with 'docker-compose up hardhat-node'"
    exit 1
fi

# Get block number
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545)

if [ -z "$RESPONSE" ]; then
    echo -e "${RED}❌ No response from Hardhat node${NC}"
    exit 1
fi

# Extract block number from response
BLOCK_HEX=$(echo "$RESPONSE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BLOCK_HEX" ]; then
    echo -e "${RED}❌ Could not extract block number from response${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# Convert hex to decimal
BLOCK_NUM=$((BLOCK_HEX))

echo -e "${GREEN}✅ Current block number: $BLOCK_NUM${NC}"
echo ""
echo "📝 To manually update subgraph.yaml, change the startBlock to: $BLOCK_NUM"
echo ""
echo "🔧 Or use automatic update:"
echo "   make update-addresses NETWORK=localhost"