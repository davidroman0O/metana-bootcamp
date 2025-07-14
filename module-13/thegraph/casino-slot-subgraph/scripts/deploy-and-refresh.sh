#!/bin/bash

# Complete deployment and refresh workflow
# Handles the full cycle of contract deployment and subgraph deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting complete deployment and refresh workflow...${NC}"

# Check if services are running
echo "🔍 Checking service health..."

check_service() {
    local service_name=$1
    local url=$2
    local max_retries=${3:-5}
    local retry_delay=${4:-2}
    
    echo -n "  $service_name: "
    
    for i in $(seq 1 $max_retries); do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Running${NC}"
            return 0
        fi
        
        if [ $i -lt $max_retries ]; then
            echo -n "."
            sleep $retry_delay
        fi
    done
    
    echo -e "${RED}❌ Down${NC}"
    return 1
}

# Check all required services
services_ok=true

if ! check_service "Hardhat Node" "http://localhost:8545"; then
    services_ok=false
fi

if ! check_service "Graph Node" "http://localhost:8000"; then
    services_ok=false
fi

if ! check_service "IPFS" "http://localhost:5001"; then
    services_ok=false
fi

# Check PostgreSQL differently
echo -n "  PostgreSQL: "
if docker-compose exec -T postgres pg_isready -h localhost -U graph-node > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Down${NC}"
    services_ok=false
fi

if [ "$services_ok" = false ]; then
    echo -e "${RED}❌ Some services are not running. Please start them with 'make dev-full'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All services are running${NC}"
echo ""

# Step 1: Deploy smart contracts
echo -e "${BLUE}1️⃣ Deploying smart contracts...${NC}"
cd ../../hardhat

if npm run compile; then
    echo -e "${GREEN}✅ Contract compilation successful${NC}"
else
    echo -e "${RED}❌ Contract compilation failed${NC}"
    exit 1
fi

if npm run deploy:local; then
    echo -e "${GREEN}✅ Contract deployment successful${NC}"
else
    echo -e "${RED}❌ Contract deployment failed${NC}"
    exit 1
fi

# Return to subgraph directory
cd - > /dev/null

# Step 2: Update contract addresses
echo -e "${BLUE}2️⃣ Updating contract addresses...${NC}"
if make update-addresses NETWORK=localhost; then
    echo -e "${GREEN}✅ Contract addresses updated${NC}"
else
    echo -e "${RED}❌ Failed to update contract addresses${NC}"
    exit 1
fi

# Step 3: Update ABI
echo -e "${BLUE}3️⃣ Updating ABI...${NC}"
if make update-abi; then
    echo -e "${GREEN}✅ ABI updated${NC}"
else
    echo -e "${RED}❌ Failed to update ABI${NC}"
    exit 1
fi

# Step 4: Generate TypeScript types
echo -e "${BLUE}4️⃣ Generating TypeScript types...${NC}"
if make codegen; then
    echo -e "${GREEN}✅ TypeScript types generated${NC}"
else
    echo -e "${RED}❌ Failed to generate TypeScript types${NC}"
    exit 1
fi

# Step 5: Build subgraph
echo -e "${BLUE}5️⃣ Building subgraph...${NC}"
if make build; then
    echo -e "${GREEN}✅ Subgraph built${NC}"
else
    echo -e "${RED}❌ Failed to build subgraph${NC}"
    exit 1
fi

# Step 6: Deploy subgraph
echo -e "${BLUE}6️⃣ Deploying subgraph...${NC}"

# First try to remove existing subgraph (ignore errors)
make remove-local 2>/dev/null || true

# Create and deploy
if make create-local && make deploy-local; then
    echo -e "${GREEN}✅ Subgraph deployed${NC}"
else
    echo -e "${YELLOW}⚠️  Initial deployment failed, retrying...${NC}"
    # Sometimes the first deployment fails, retry once
    sleep 5
    if make deploy-local; then
        echo -e "${GREEN}✅ Subgraph deployed on retry${NC}"
    else
        echo -e "${RED}❌ Failed to deploy subgraph${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🎉 Complete deployment and refresh workflow completed successfully!${NC}"
echo ""
echo "🌐 Access your subgraph:"
echo "  • GraphiQL: http://localhost:8000/subgraphs/name/casino-slot-subgraph/graphql"
echo "  • Graph Admin: http://localhost:8020"
echo "  • Subgraph status: http://localhost:8000/subgraphs/name/casino-slot-subgraph"
echo ""
echo "🔄 To refresh after changes:"
echo "  • Contract changes: make refresh-contracts"
echo "  • Subgraph changes: make refresh-subgraph"
echo "  • Full refresh: make refresh-all"
echo "  • Auto-watch: make watch-dev"