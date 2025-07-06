#!/bin/bash

# Quick check if hardhat is accepting connections
# Returns 0 if port is open, 1 if not

if nc -z localhost 8545 2>/dev/null; then
    echo "✅ Hardhat port is open (8545)"
    
    # Try a simple web3_clientVersion call (usually faster than eth_chainId)
    RESPONSE=$(curl -s --max-time 2 -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' \
        http://localhost:8545 2>/dev/null)
    
    if [ -n "$RESPONSE" ]; then
        echo "✅ Hardhat is responding to RPC calls"
        if echo "$RESPONSE" | grep -q "HardhatNetwork"; then
            echo "✅ Confirmed: Running HardhatNetwork"
        fi
    else
        echo "⏳ Hardhat is starting up (forking mainnet...)"
        echo "   This can take 2-3 minutes on first start"
    fi
    exit 0
else
    echo "❌ Hardhat port is not open"
    exit 1
fi