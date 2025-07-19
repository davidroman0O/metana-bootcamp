#!/bin/bash
# Validator Key Import Script for eth-docker
# This script imports validator keys into the running consensus client

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Validator Key Import for eth-docker          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in eth-docker directory
if [ ! -f "docker-compose.yml" ] || [ ! -d ".." ]; then
    echo -e "${RED}Error: This script must be run from the eth-docker directory${NC}"
    echo "Please run: cd ~/ethereum/eth-docker && ./import-validator-keys.sh"
    exit 1
fi

# Check if validator-keys directory exists and has keys
if [ ! -d "validator-keys" ]; then
    echo -e "${RED}Error: validator-keys directory not found${NC}"
    echo "Creating directory..."
    mkdir -p validator-keys
fi

# Count keystore files
KEYSTORE_COUNT=$(find validator-keys -name "keystore-*.json" 2>/dev/null | wc -l)

if [ "$KEYSTORE_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No keystore files found in validator-keys directory${NC}"
    echo ""
    echo "Looking for keys in home directory..."
    
    # Try to find and copy keys from home directory
    FOUND_KEYS=false
    # Look for keys directly in validator_keys_* directories (ethstaker format)
    for key_dir in ~/validator_keys_*; do
        if [ -d "$key_dir" ] && [ "$(find "$key_dir" -name "keystore-*.json" 2>/dev/null | wc -l)" -gt 0 ]; then
            echo -e "${GREEN}Found keys in $key_dir${NC}"
            echo "Copying keys to validator-keys directory..."
            cp "$key_dir"/keystore-*.json validator-keys/
            cp "$key_dir"/deposit_data-*.json validator-keys/ 2>/dev/null || true
            FOUND_KEYS=true
            break
        fi
    done
    
    # Also check for keys in nested validator_keys subdirectory (old format)
    if [ "$FOUND_KEYS" = false ]; then
        for key_dir in ~/validator_keys_*/validator_keys; do
            if [ -d "$key_dir" ] && [ "$(find "$key_dir" -name "keystore-*.json" 2>/dev/null | wc -l)" -gt 0 ]; then
                echo -e "${GREEN}Found keys in $key_dir${NC}"
                echo "Copying keys to validator-keys directory..."
                cp "$key_dir"/keystore-*.json validator-keys/
                if [ -f "$key_dir/../deposit_data-"*.json ]; then
                    cp "$key_dir/../deposit_data-"*.json validator-keys/
                fi
                FOUND_KEYS=true
                break
            fi
        done
    fi
    
    if [ "$FOUND_KEYS" = false ]; then
        echo -e "${RED}No validator keys found!${NC}"
        echo ""
        echo "Please ensure you have:"
        echo "1. Generated validator keys using generate-keys.sh"
        echo "2. Transferred them using transfer-validator-keys.sh"
        echo "3. Keys are in ~/validator_keys_*/validator_keys/"
        exit 1
    fi
    
    # Update keystore count
    KEYSTORE_COUNT=$(find validator-keys -name "keystore-*.json" 2>/dev/null | wc -l)
fi

echo -e "${GREEN}Found $KEYSTORE_COUNT validator key(s) to import${NC}"
echo ""

# Check if consensus client is running
if ! docker-compose ps | grep -q "consensus.*Up"; then
    echo -e "${RED}Error: Consensus client is not running${NC}"
    echo "Please start eth-docker first:"
    echo "  docker-compose up -d"
    exit 1
fi

# Detect consensus client type from docker-compose.yml or .env
CONSENSUS_CLIENT=""
if [ -f ".env" ]; then
    CONSENSUS_CLIENT=$(grep -E "^(CC_CLIENT|CL_NODE|CONSENSUS_CLIENT)" .env | cut -d'=' -f2 | tr -d '"' | tr '[:upper:]' '[:lower:]')
fi

if [ -z "$CONSENSUS_CLIENT" ]; then
    # Try to detect from running container
    if docker-compose ps | grep -q "teku"; then
        CONSENSUS_CLIENT="teku"
    elif docker-compose ps | grep -q "nimbus"; then
        CONSENSUS_CLIENT="nimbus"
    elif docker-compose ps | grep -q "lighthouse"; then
        CONSENSUS_CLIENT="lighthouse"
    elif docker-compose ps | grep -q "prysm"; then
        CONSENSUS_CLIENT="prysm"
    elif docker-compose ps | grep -q "lodestar"; then
        CONSENSUS_CLIENT="lodestar"
    fi
fi

echo -e "${BLUE}Detected consensus client: ${YELLOW}$CONSENSUS_CLIENT${NC}"
echo ""

# Set correct ownership for Docker
echo -e "${BLUE}Setting correct permissions...${NC}"
sudo chown -R 1000:1000 validator-keys/
sudo chmod 600 validator-keys/keystore-*.json 2>/dev/null || true
sudo chmod 644 validator-keys/deposit_data-*.json 2>/dev/null || true

# Import based on consensus client
case "$CONSENSUS_CLIENT" in
    "teku")
        echo -e "${BLUE}Importing keys for Teku...${NC}"
        echo ""
        echo -e "${YELLOW}You will be prompted for your keystore password${NC}"
        echo ""
        
        # For Teku, we need to restart with the keys mounted
        echo "Restarting Teku to load validator keys..."
        docker-compose restart consensus
        
        echo ""
        echo -e "${GREEN}✅ Keys imported! Teku will automatically load them.${NC}"
        echo ""
        echo "Monitor the logs to verify:"
        echo "  docker-compose logs -f consensus | grep -i validator"
        ;;
        
    "nimbus")
        echo -e "${BLUE}Importing keys for Nimbus...${NC}"
        echo -e "${YELLOW}You will be prompted for your keystore password${NC}"
        echo ""
        
        # Nimbus import command
        docker-compose exec consensus nimbus_beacon_node deposits import \
            --data-dir=/var/lib/nimbus \
            /validator-keys
        
        echo -e "${GREEN}✅ Keys imported successfully!${NC}"
        ;;
        
    "lighthouse")
        echo -e "${BLUE}Importing keys for Lighthouse...${NC}"
        echo -e "${YELLOW}You will be prompted for your keystore password${NC}"
        echo ""
        
        # Lighthouse import command
        docker-compose exec consensus lighthouse account validator import \
            --directory /validator-keys \
            --datadir /var/lib/lighthouse
        
        echo -e "${GREEN}✅ Keys imported successfully!${NC}"
        ;;
        
    "prysm")
        echo -e "${BLUE}Importing keys for Prysm...${NC}"
        echo -e "${YELLOW}You will be prompted for your keystore password${NC}"
        echo ""
        
        # Prysm import command
        docker-compose exec consensus validator accounts import \
            --keys-dir=/validator-keys \
            --wallet-dir=/var/lib/prysm/validator
        
        echo -e "${GREEN}✅ Keys imported successfully!${NC}"
        ;;
        
    "lodestar")
        echo -e "${BLUE}Importing keys for Lodestar...${NC}"
        echo -e "${YELLOW}You will be prompted for your keystore password${NC}"
        echo ""
        
        # Lodestar import command
        docker-compose exec consensus lodestar validator import \
            --keystoresDir /validator-keys \
            --dataDir /var/lib/lodestar
        
        echo -e "${GREEN}✅ Keys imported successfully!${NC}"
        ;;
        
    *)
        echo -e "${RED}Unknown consensus client: $CONSENSUS_CLIENT${NC}"
        echo ""
        echo "Please import keys manually according to your client's documentation"
        echo "Keys are located in: $(pwd)/validator-keys/"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Monitor validator logs:"
echo "   docker-compose logs -f consensus | grep -i validator"
echo ""
echo "2. Check for successful attestations (after activation):"
echo "   docker-compose logs consensus | grep -i attestation"
echo ""
echo "3. Monitor on beaconcha.in:"
echo "   https://hoodi.beaconcha.in"
echo ""
echo -e "${YELLOW}Note: Your validator will only start attesting after:${NC}"
echo "- Your 32 ETH deposit is made"
echo "- The deposit is processed (~16 hours)"
echo "- Your validator is activated"