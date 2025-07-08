#!/bin/bash

# Smart deployment script with intelligent retry and user feedback
# Handles graph-node startup timing and provides helpful diagnostics

# Don't exit on first error - we want to handle them gracefully
set +e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Spinner animation
spin() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Function to show service status
show_service_status() {
    echo -e "\n${BLUE}📊 Service Status:${NC}"
    
    # Check each service
    local hardhat_status="❌"
    local ipfs_status="❌"
    local postgres_status="❌"
    local graph_status="❌"
    
    docker-compose ps -q hardhat-node >/dev/null 2>&1 && hardhat_status="✅"
    docker-compose ps -q ipfs >/dev/null 2>&1 && ipfs_status="✅"
    docker-compose ps -q postgres >/dev/null 2>&1 && postgres_status="✅"
    docker-compose ps -q graph-node >/dev/null 2>&1 && graph_status="✅"
    
    echo -e "   Hardhat: $hardhat_status | IPFS: $ipfs_status | Postgres: $postgres_status | Graph: $graph_status"
}

# Function to wait for graph-node with progress updates
wait_for_graph_node() {
    local max_attempts=24  # 2 minutes with 5 second intervals
    local attempt=0
    
    echo -e "${YELLOW}⏳ Waiting for graph-node to be ready...${NC}"
    echo -e "${BLUE}   This typically takes 30-60 seconds${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        # Check if graph-node is healthy
        if ./scripts/check-graph-health.sh >/dev/null 2>&1; then
            echo -e "\n${GREEN}✅ Graph-node is ready!${NC}"
            return 0
        fi
        
        # Progress indicator
        attempt=$((attempt + 1))
        local elapsed=$((attempt * 5))
        
        # Different messages based on time elapsed
        if [ $elapsed -eq 15 ]; then
            echo -e "\n${BLUE}   Still starting up... Graph-node is initializing its database${NC}"
        elif [ $elapsed -eq 30 ]; then
            echo -e "\n${YELLOW}   Taking longer than usual. Checking status...${NC}"
            ./scripts/check-graph-health.sh -v | grep -E "Recent activity:|→" | head -5
        elif [ $elapsed -eq 60 ]; then
            echo -e "\n${YELLOW}⚠️  This is taking unusually long. Recent logs:${NC}"
            docker-compose logs --tail=10 graph-node | grep -E "ERROR|WARN|error|Error" || echo "   No errors in recent logs"
            echo -e "${YELLOW}   You can check full logs with: docker-compose logs graph-node${NC}"
        elif [ $elapsed -eq 90 ]; then
            echo -e "\n${RED}⚠️  Graph-node is having trouble starting.${NC}"
            echo -e "${YELLOW}   Checking for common issues...${NC}"
            
            # Check postgres
            if ! docker-compose ps -q postgres >/dev/null 2>&1; then
                echo -e "${RED}   ❌ PostgreSQL is not running!${NC}"
                echo -e "${YELLOW}   → Try: docker-compose up -d postgres${NC}"
            fi
            
            # Check disk space
            local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | tr -d '%')
            if [ $disk_usage -gt 90 ]; then
                echo -e "${RED}   ❌ Low disk space: ${disk_usage}% used${NC}"
            fi
        fi
        
        # Show spinner for 5 seconds
        printf "   ${elapsed}s elapsed "
        sleep 5 &
        spin $!
        
        # Every 20 seconds, show what's happening
        if [ $((elapsed % 20)) -eq 0 ] && [ $elapsed -gt 0 ]; then
            echo -ne "\r\033[K"  # Clear line
            show_service_status
            printf "   ${elapsed}s elapsed "
        else
            echo -ne "\r   ${elapsed}s elapsed    "
        fi
    done
    
    echo -e "\n${RED}❌ Graph-node failed to start after 2 minutes${NC}"
    echo -e "${YELLOW}   Troubleshooting suggestions:${NC}"
    echo -e "${YELLOW}   1. Check logs: docker-compose logs graph-node${NC}"
    echo -e "${YELLOW}   2. Restart services: docker-compose restart${NC}"
    echo -e "${YELLOW}   3. Clean restart: make dev-clean && make dev${NC}"
    return 1
}

echo -e "${CYAN}🚀 Starting intelligent deployment procedure...${NC}"
echo -e "${BLUE}   I'll guide you through any issues that come up${NC}"
echo ""

# Step 1: Check initial state
show_service_status

# Step 2: Handle graph-node if running
GRAPH_NODE_RUNNING=$(docker-compose ps -q graph-node 2>/dev/null)
if [ ! -z "$GRAPH_NODE_RUNNING" ]; then
    GRAPH_NODE_STATUS=$(docker inspect -f '{{.State.Status}}' $GRAPH_NODE_RUNNING 2>/dev/null || echo "unknown")
    if [ "$GRAPH_NODE_STATUS" = "running" ]; then
        echo -e "\n${YELLOW}⏸️  Stopping graph-node to prevent hardhat flooding...${NC}"
        docker-compose stop graph-node
        echo -e "${GREEN}   ✓ Graph-node stopped${NC}"
    fi
else
    echo -e "\n${GREEN}✓ Graph-node is not running (good - prevents hardhat flooding)${NC}"
fi

# Step 3: Wait for hardhat
echo -e "\n${YELLOW}⏳ Checking Hardhat node...${NC}"
if ! make wait-for-hardhat; then
    echo -e "${RED}❌ Hardhat node is not ready${NC}"
    echo -e "${YELLOW}   → Check if it's running: docker-compose ps hardhat-node${NC}"
    echo -e "${YELLOW}   → View logs: docker-compose logs hardhat-node${NC}"
    exit 1
fi

# Step 4: Deploy contracts
echo -e "\n${YELLOW}📦 Deploying smart contracts...${NC}"
if ! make deploy-contracts; then
    echo -e "${RED}❌ Contract deployment failed${NC}"
    echo -e "${YELLOW}   This might be due to:${NC}"
    echo -e "${YELLOW}   - Hardhat node issues (try: docker-compose restart hardhat-node)${NC}"
    echo -e "${YELLOW}   - Previous deployment artifacts (try: make reset-contracts)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Contracts deployed successfully${NC}"

# Step 5: Fund contract (if needed)
if make -n fund-contract >/dev/null 2>&1; then
    echo -e "\n${YELLOW}💰 Funding contract...${NC}"
    make fund-contract || echo -e "${YELLOW}   ℹ️  Contract funding skipped (may already be funded)${NC}"
fi

# Step 6: Start graph-node
echo -e "\n${YELLOW}▶️  Starting graph-node...${NC}"
docker-compose up -d graph-node

# Step 7: Wait for graph-node with intelligent monitoring
if ! wait_for_graph_node; then
    exit 1
fi

# Step 8: Deploy subgraph with retry
echo -e "\n${YELLOW}📊 Deploying subgraph...${NC}"
DEPLOY_ATTEMPTS=0
MAX_DEPLOY_ATTEMPTS=3

while [ $DEPLOY_ATTEMPTS -lt $MAX_DEPLOY_ATTEMPTS ]; do
    DEPLOY_ATTEMPTS=$((DEPLOY_ATTEMPTS + 1))
    
    if make deploy-subgraph; then
        echo -e "${GREEN}✅ Subgraph deployed successfully!${NC}"
        break
    else
        if [ $DEPLOY_ATTEMPTS -lt $MAX_DEPLOY_ATTEMPTS ]; then
            echo -e "${YELLOW}⚠️  Deployment failed (attempt $DEPLOY_ATTEMPTS/$MAX_DEPLOY_ATTEMPTS)${NC}"
            echo -e "${BLUE}   Retrying in 10 seconds...${NC}"
            
            # Check if it's a connection issue
            if ! ./scripts/check-graph-health.sh >/dev/null 2>&1; then
                echo -e "${YELLOW}   Graph-node seems to have stopped. Restarting...${NC}"
                docker-compose restart graph-node
                wait_for_graph_node
            fi
            
            sleep 10
        else
            echo -e "${RED}❌ Subgraph deployment failed after $MAX_DEPLOY_ATTEMPTS attempts${NC}"
            echo -e "${YELLOW}   Troubleshooting:${NC}"
            echo -e "${YELLOW}   1. Check graph-node logs: docker-compose logs --tail=50 graph-node${NC}"
            echo -e "${YELLOW}   2. Verify IPFS is running: docker-compose ps ipfs${NC}"
            echo -e "${YELLOW}   3. Try manual deployment: make deploy-subgraph${NC}"
            exit 1
        fi
    fi
done

# Final status check
echo ""
show_service_status

# Success message
echo ""
echo -e "${GREEN}🎉 Full deployment completed successfully!${NC}"
echo -e "${GREEN}📊 You can now query the subgraph at:${NC}"
echo -e "${CYAN}   http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo -e "${BLUE}   - Test the subgraph in GraphiQL${NC}"
echo -e "${BLUE}   - Run scripts with: make run-vrf or make run-test-multi${NC}"
echo -e "${BLUE}   - Monitor logs: docker-compose logs -f graph-node${NC}"