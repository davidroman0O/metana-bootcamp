#!/bin/bash

# File watcher for automatic development refresh
# Watches for changes in smart contracts, subgraph schema, and handlers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Starting file watcher for development...${NC}"

# Check if fswatch is available (macOS)
if command -v fswatch &> /dev/null; then
    WATCHER="fswatch"
elif command -v inotifywait &> /dev/null; then
    WATCHER="inotifywait"
else
    echo -e "${RED}❌ No file watcher found. Please install fswatch (macOS) or inotify-tools (Linux)${NC}"
    echo "macOS: brew install fswatch"
    echo "Linux: sudo apt-get install inotify-tools"
    exit 1
fi

# Directories to watch
CONTRACTS_DIR="../../hardhat/contracts"
SCHEMA_FILE="./schema.graphql"
HANDLERS_DIR="./src"
SUBGRAPH_YAML="./subgraph.yaml"

echo -e "${BLUE}👀 Watching for changes in:${NC}"
echo "  📄 Smart contracts: $CONTRACTS_DIR"
echo "  📊 Schema: $SCHEMA_FILE"
echo "  🛠️  Handlers: $HANDLERS_DIR"
echo "  ⚙️  Subgraph config: $SUBGRAPH_YAML"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop watching${NC}"
echo ""

# Function to handle contract changes
handle_contract_change() {
    echo -e "${GREEN}📝 Contract change detected!${NC}"
    echo "🔄 Refreshing contracts..."
    if make refresh-contracts; then
        echo -e "${GREEN}✅ Contracts refreshed successfully${NC}"
    else
        echo -e "${RED}❌ Contract refresh failed${NC}"
    fi
    echo ""
}

# Function to handle subgraph changes
handle_subgraph_change() {
    echo -e "${GREEN}📝 Subgraph change detected!${NC}"
    echo "🔄 Refreshing subgraph..."
    if make refresh-subgraph; then
        echo -e "${GREEN}✅ Subgraph refreshed successfully${NC}"
    else
        echo -e "${RED}❌ Subgraph refresh failed${NC}"
    fi
    echo ""
}

# Function to handle full refresh
handle_full_refresh() {
    echo -e "${GREEN}📝 Major change detected!${NC}"
    echo "🔄 Full refresh (contracts + subgraph)..."
    if make refresh-all; then
        echo -e "${GREEN}✅ Full refresh completed successfully${NC}"
    else
        echo -e "${RED}❌ Full refresh failed${NC}"
    fi
    echo ""
}

# Track last refresh time to avoid duplicate refreshes
last_contract_refresh=0
last_subgraph_refresh=0
refresh_cooldown=5  # seconds

# Function to check cooldown
should_refresh() {
    local refresh_type=$1
    local current_time=$(date +%s)
    
    if [ "$refresh_type" = "contract" ]; then
        if [ $((current_time - last_contract_refresh)) -gt $refresh_cooldown ]; then
            last_contract_refresh=$current_time
            return 0
        fi
    elif [ "$refresh_type" = "subgraph" ]; then
        if [ $((current_time - last_subgraph_refresh)) -gt $refresh_cooldown ]; then
            last_subgraph_refresh=$current_time
            return 0
        fi
    fi
    
    return 1
}

# macOS fswatch implementation
if [ "$WATCHER" = "fswatch" ]; then
    fswatch -0 \
        "$CONTRACTS_DIR" \
        "$SCHEMA_FILE" \
        "$HANDLERS_DIR" \
        "$SUBGRAPH_YAML" \
        2>/dev/null | while read -d "" file; do
        
        case "$file" in
            *"$CONTRACTS_DIR"*)
                if should_refresh "contract"; then
                    handle_contract_change
                fi
                ;;
            *"schema.graphql"*|*"src/"*|*"subgraph.yaml"*)
                if should_refresh "subgraph"; then
                    handle_subgraph_change
                fi
                ;;
        esac
    done

# Linux inotifywait implementation
elif [ "$WATCHER" = "inotifywait" ]; then
    while true; do
        # Watch for changes in contracts
        inotifywait -r -e modify,create,delete,move "$CONTRACTS_DIR" "$HANDLERS_DIR" "$SCHEMA_FILE" "$SUBGRAPH_YAML" 2>/dev/null | while read path action file; do
            case "$path" in
                *"$CONTRACTS_DIR"*)
                    if should_refresh "contract"; then
                        handle_contract_change
                    fi
                    ;;
                *"src/"*|*"schema.graphql"*|*"subgraph.yaml"*)
                    if should_refresh "subgraph"; then
                        handle_subgraph_change
                    fi
                    ;;
            esac
        done
    done
fi