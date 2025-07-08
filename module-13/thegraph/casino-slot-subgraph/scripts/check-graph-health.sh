#!/bin/bash

# Smart health check for graph-node
# Provides detailed feedback about graph-node status and potential issues

# Check if output is to terminal for color support
if [ -t 1 ]; then
    # Colors for output
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    # No colors for non-terminal output
    GREEN=''
    YELLOW=''
    RED=''
    BLUE=''
    NC=''
fi

# Exit codes:
# 0 = healthy
# 1 = container not running
# 2 = port not responding
# 3 = postgres issues
# 4 = ipfs issues
# 5 = unhealthy but running

# Check if verbose mode
VERBOSE=false
if [[ "$1" == "-v" ]] || [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

# Function to check if a container is running
check_container() {
    local container_name=$1
    local container_id=$(docker-compose ps -q $container_name 2>/dev/null)
    
    if [ -z "$container_id" ]; then
        return 1
    fi
    
    local status=$(docker inspect -f '{{.State.Status}}' $container_id 2>/dev/null)
    if [ "$status" = "running" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check if a port is responding
check_port() {
    local host=$1
    local port=$2
    nc -z -w 2 $host $port >/dev/null 2>&1
    return $?
}

# Main health check
echo -e "${BLUE}🔍 Checking Graph Node health...${NC}"

# 1. Check if graph-node container exists and is running
if ! check_container "graph-node"; then
    echo -e "${RED}❌ Graph-node container is not running${NC}"
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}   → Try: docker-compose up -d graph-node${NC}"
        echo -e "${YELLOW}   → Or check logs: docker-compose logs graph-node${NC}"
    fi
    exit 1
fi

# 2. Check if hardhat is running (dependency)
if ! check_container "hardhat-node"; then
    echo -e "${YELLOW}⚠️  Hardhat node is not running (graph-node dependency)${NC}"
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}   → Graph-node needs hardhat to be running${NC}"
        echo -e "${YELLOW}   → Try: docker-compose up -d hardhat-node${NC}"
    fi
fi

# 3. Check if postgres is accessible
if ! check_container "postgres"; then
    echo -e "${RED}❌ PostgreSQL is not running (required for graph-node)${NC}"
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}   → Try: docker-compose up -d postgres${NC}"
    fi
    exit 3
fi

# 4. Check if IPFS is accessible
if ! check_port "localhost" "5001"; then
    echo -e "${YELLOW}⚠️  IPFS is not responding on port 5001${NC}"
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}   → Graph-node needs IPFS for storing subgraph files${NC}"
        echo -e "${YELLOW}   → Try: docker-compose restart ipfs${NC}"
    fi
fi

# 5. Check if graph-node port 8000 is responding
echo -n "Checking Graph Node HTTP endpoint... "
if ! check_port "localhost" "8000"; then
    echo -e "${YELLOW}waiting${NC}"
    
    # Check if it's still starting up
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}   → Graph-node is starting up, this can take 30-60 seconds${NC}"
        echo -e "${BLUE}   → Checking recent logs...${NC}"
        
        # Show last few log lines
        RECENT_LOGS=$(docker-compose logs --tail=5 graph-node 2>&1 | grep -E "INFO|WARN|ERROR" | tail -3)
        if [ ! -z "$RECENT_LOGS" ]; then
            echo -e "${BLUE}   Recent activity:${NC}"
            echo "$RECENT_LOGS" | while IFS= read -r line; do
                echo "     $line"
            done
        fi
    fi
    exit 2
fi
echo -e "${GREEN}✓${NC}"

# 6. Try to query the node status
echo -n "Checking Graph Node GraphQL endpoint... "
RESPONSE=$(curl -s -f -X POST -H "Content-Type: application/json" \
    --data '{"query":"{ indexingStatuses { subgraph synced health } }"}' \
    http://localhost:8020 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
    
    # Check if any subgraphs are deployed
    if echo "$RESPONSE" | grep -q '"indexingStatuses":\[\]'; then
        echo -e "${YELLOW}ℹ️  No subgraphs deployed yet${NC}"
        if [ "$VERBOSE" = true ]; then
            echo -e "${BLUE}   → Deploy with: make deploy-subgraph${NC}"
        fi
    fi
else
    echo -e "${YELLOW}waiting${NC}"
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}   → GraphQL endpoint not ready yet${NC}"
        echo -e "${BLUE}   → This is normal during startup${NC}"
    fi
    exit 5
fi

# 7. Check for common issues
if [ "$VERBOSE" = true ]; then
    # Check for high memory usage
    MEMORY_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" casino-slot-subgraph-graph-node-1 2>/dev/null | tr -d '%')
    if [ ! -z "$MEMORY_USAGE" ] && [ "$MEMORY_USAGE" -gt "80" ]; then
        echo -e "${YELLOW}⚠️  High memory usage: ${MEMORY_USAGE}%${NC}"
        echo -e "${YELLOW}   → Consider restarting if performance degrades${NC}"
    fi
    
    # Check hardhat flooding
    HARDHAT_RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" --max-time 1 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://localhost:8545 2>/dev/null)
    if [ $? -eq 0 ] && [ $(echo "$HARDHAT_RESPONSE_TIME > 0.5" | bc -l) -eq 1 ]; then
        echo -e "${YELLOW}⚠️  Hardhat is slow (${HARDHAT_RESPONSE_TIME}s response time)${NC}"
        echo -e "${YELLOW}   → Graph-node might be flooding it with requests${NC}"
        echo -e "${YELLOW}   → Consider using 'make pause-graph' when running scripts${NC}"
    fi
fi

# All checks passed
echo -e "${GREEN}✅ Graph Node is healthy and ready!${NC}"

# Show connection info
if [ "$VERBOSE" = true ]; then
    echo ""
    echo -e "${BLUE}📍 Connection endpoints:${NC}"
    echo "   - HTTP: http://localhost:8000"
    echo "   - WebSocket: ws://localhost:8001"
    echo "   - Admin: http://localhost:8020"
    echo "   - Metrics: http://localhost:8040"
fi

exit 0