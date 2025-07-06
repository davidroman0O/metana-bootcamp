#!/bin/bash

# Check Hardhat node health by testing multiple RPC methods
# Returns 0 if healthy, 1 if not ready

# Check if output is to terminal for color support
if [ -t 1 ]; then
    # Colors for output
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    NC='\033[0m' # No Color
else
    # No colors for non-terminal output
    GREEN=''
    YELLOW=''
    RED=''
    NC=''
fi

# Function to make RPC call
rpc_call() {
    local method=$1
    local params=$2
    curl -s --max-time 3 -X POST -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}" \
        http://localhost:8545 2>/dev/null
}

# Check 1: Can we get the chain ID? (basic connectivity)
echo -n "Checking chain ID... "
CHAIN_RESPONSE=$(rpc_call "eth_chainId" "[]")
if echo "$CHAIN_RESPONSE" | grep -q "result"; then
    CHAIN_ID=$(echo "$CHAIN_RESPONSE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Chain ID: $CHAIN_ID"
else
    echo -e "${RED}✗${NC} Cannot get chain ID - node not ready"
    exit 1
fi

# Check 2: Can we get the latest block? (sync status)
echo -n "Checking latest block... "
BLOCK_RESPONSE=$(rpc_call "eth_blockNumber" "[]")
if echo "$BLOCK_RESPONSE" | grep -q "result"; then
    BLOCK_HEX=$(echo "$BLOCK_RESPONSE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    BLOCK_NUM=$((BLOCK_HEX))
    echo -e "${GREEN}✓${NC} Block number: $BLOCK_NUM"
else
    echo -e "${YELLOW}⏳${NC} Still syncing blocks..."
    exit 1
fi

# Check 3: Can we get accounts? (ready for transactions)
echo -n "Checking accounts... "
ACCOUNTS_RESPONSE=$(rpc_call "eth_accounts" "[]")
if echo "$ACCOUNTS_RESPONSE" | grep -q "result"; then
    echo -e "${GREEN}✓${NC} Accounts available"
else
    echo -e "${YELLOW}⏳${NC} Accounts not ready..."
    exit 1
fi

# Check 4: Can we estimate gas? (full functionality)
echo -n "Checking gas estimation... "
GAS_RESPONSE=$(rpc_call "eth_gasPrice" "[]")
if echo "$GAS_RESPONSE" | grep -q "result"; then
    echo -e "${GREEN}✓${NC} Gas price available"
else
    echo -e "${YELLOW}⏳${NC} Gas estimation not ready..."
    exit 1
fi

# Check 5: Can we get network version? (network ready)
echo -n "Checking network... "
NET_RESPONSE=$(rpc_call "net_version" "[]")
if echo "$NET_RESPONSE" | grep -q "result"; then
    NET_VERSION=$(echo "$NET_RESPONSE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Network version: $NET_VERSION"
else
    echo -e "${YELLOW}⏳${NC} Network not ready..."
    exit 1
fi

# All checks passed
echo -e "\n${GREEN}✅ Hardhat node is fully ready!${NC}"
exit 0