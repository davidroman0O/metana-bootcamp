#!/bin/bash
# Ethereum Validator Voluntary Exit Script
# This script helps perform a voluntary exit for your validator

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ETH_DOCKER_DIR="${ETH_DOCKER_DIR:-$HOME/ethereum/eth-docker}"
CONSENSUS_ENDPOINT="http://localhost:5052"

echo -e "${RED}════════════════════════════════════════════════════${NC}"
echo -e "${RED}     ETHEREUM VALIDATOR VOLUNTARY EXIT TOOL         ${NC}"
echo -e "${RED}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  WARNING: PLEASE READ CAREFULLY ⚠️${NC}"
echo ""
echo "This tool will initiate a PERMANENT voluntary exit for your validator(s)."
echo ""
echo -e "${RED}CONSEQUENCES:${NC}"
echo "• Your validator will STOP earning rewards immediately"
echo "• You CANNOT reactivate the validator - this is IRREVERSIBLE"
echo "• Your stake will be withdrawable after the exit is finalized"
echo "• The exit process cannot be cancelled once initiated"
echo ""
echo -e "${YELLOW}BEFORE PROCEEDING:${NC}"
echo "• Ensure you have completed all required attestations"
echo "• Verify you have earned sufficient rewards"
echo "• Confirm this is required for your assignment/purpose"
echo "• Have your validator keystore password ready"
echo ""

# Confirmation 1
read -p "Do you understand the consequences? Type 'YES' to continue: " confirm1
if [ "$confirm1" != "YES" ]; then
    echo -e "${GREEN}Exit cancelled.${NC}"
    exit 0
fi

# Check if eth-docker exists
if [ ! -d "$ETH_DOCKER_DIR" ]; then
    echo -e "${RED}eth-docker directory not found at: $ETH_DOCKER_DIR${NC}"
    echo "Please set ETH_DOCKER_DIR environment variable"
    exit 1
fi

cd "$ETH_DOCKER_DIR"

# Check if services are running
echo ""
echo -e "${BLUE}Checking validator status...${NC}"
if ! docker-compose ps | grep -q "validator.*Up"; then
    echo -e "${RED}Validator service is not running!${NC}"
    echo "Please start your validator first: ./ethd start"
    exit 1
fi

# Get validator information
echo ""
echo -e "${BLUE}Fetching validator information...${NC}"
VALIDATOR_PUBKEYS=$(docker-compose exec -T validator curl -s \
    "${CONSENSUS_ENDPOINT}/eth/v1/keystores" | \
    jq -r '.data[].validating_pubkey' 2>/dev/null || echo "")

if [ -z "$VALIDATOR_PUBKEYS" ]; then
    echo -e "${RED}No validators found!${NC}"
    echo "Please ensure your validators are properly imported."
    exit 1
fi

# Display validators
echo ""
echo -e "${GREEN}Found the following validators:${NC}"
echo "$VALIDATOR_PUBKEYS" | nl -s '. '

VALIDATOR_COUNT=$(echo "$VALIDATOR_PUBKEYS" | wc -l)
echo ""
echo -e "${YELLOW}Total validators: $VALIDATOR_COUNT${NC}"

# Select validators to exit
echo ""
echo "Which validators do you want to exit?"
echo "1. All validators"
echo "2. Specific validator(s)"
read -p "Enter your choice (1 or 2): " exit_choice

SELECTED_VALIDATORS=""
if [ "$exit_choice" == "2" ]; then
    read -p "Enter validator numbers separated by spaces (e.g., 1 3 5): " validator_nums
    for num in $validator_nums; do
        PUBKEY=$(echo "$VALIDATOR_PUBKEYS" | sed -n "${num}p")
        if [ -n "$PUBKEY" ]; then
            SELECTED_VALIDATORS="${SELECTED_VALIDATORS}${PUBKEY}\n"
        fi
    done
else
    SELECTED_VALIDATORS="$VALIDATOR_PUBKEYS"
fi

# Display selected validators
echo ""
echo -e "${YELLOW}Selected validators for exit:${NC}"
echo -e "$SELECTED_VALIDATORS" | nl -s '. '

# Get current epoch and calculate exit time
echo ""
echo -e "${BLUE}Checking network status...${NC}"
CURRENT_EPOCH=$(docker-compose exec -T consensus curl -s \
    "${CONSENSUS_ENDPOINT}/eth/v1/beacon/headers/finalized" | \
    jq -r '.data.header.message.slot' | \
    awk '{print int($1/32)}' 2>/dev/null || echo "Unknown")

echo -e "Current epoch: ${CURRENT_EPOCH}"
echo ""
echo -e "${YELLOW}Exit timeline:${NC}"
echo "• Exit initiation: Now"
echo "• Exit completion: ~1-2 days (network dependent)"
echo "• Withdrawable: After exit epoch + withdrawal delay"
echo ""

# Final confirmation
echo -e "${RED}════════════════════════════════════════════════════${NC}"
echo -e "${RED}                FINAL CONFIRMATION                  ${NC}"
echo -e "${RED}════════════════════════════════════════════════════${NC}"
echo ""
echo "You are about to exit $(echo -e "$SELECTED_VALIDATORS" | wc -l) validator(s)"
echo "This action is PERMANENT and CANNOT BE UNDONE!"
echo ""
read -p "Type 'EXIT MY VALIDATORS' to proceed: " final_confirm

if [ "$final_confirm" != "EXIT MY VALIDATORS" ]; then
    echo -e "${GREEN}Exit cancelled.${NC}"
    exit 0
fi

# Create exit commands based on consensus client
CC_CLIENT=$(grep "^CC_CLIENT=" .env | cut -d'=' -f2)

case "$CC_CLIENT" in
    "lighthouse")
        EXIT_CMD="lighthouse account validator exit --beacon-node ${CONSENSUS_ENDPOINT}"
        ;;
    "teku")
        EXIT_CMD="teku voluntary-exit --beacon-node-api-endpoint=${CONSENSUS_ENDPOINT}"
        ;;
    "nimbus")
        EXIT_CMD="nimbus_beacon_node deposits exit --rest-url=${CONSENSUS_ENDPOINT}"
        ;;
    "prysm")
        EXIT_CMD="prysm validator accounts voluntary-exit --beacon-rpc-provider=${CONSENSUS_ENDPOINT}"
        ;;
    *)
        echo -e "${RED}Unsupported consensus client: $CC_CLIENT${NC}"
        exit 1
        ;;
esac

# Perform the exit
echo ""
echo -e "${YELLOW}Initiating voluntary exit...${NC}"
echo "You will be prompted for your keystore password."
echo ""

# Execute exit for each validator
for PUBKEY in $(echo -e "$SELECTED_VALIDATORS" | grep -v "^$"); do
    echo -e "${BLUE}Exiting validator: ${PUBKEY:0:10}...${NC}"
    
    docker-compose exec validator $EXIT_CMD --pubkey="$PUBKEY" || {
        echo -e "${RED}Failed to exit validator: $PUBKEY${NC}"
        echo "Please check the error and try again."
        exit 1
    }
    
    echo -e "${GREEN}✓ Exit initiated for ${PUBKEY:0:10}...${NC}"
    sleep 2
done

# Success message
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}         VOLUNTARY EXIT INITIATED SUCCESSFULLY       ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor your validator status on the beacon chain explorer"
echo "2. Wait for the exit to be processed (usually within 1-2 days)"
echo "3. Your stake will be withdrawable after the exit is finalized"
echo "4. Keep your node running until the exit is complete"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "• Save your validator keys - you'll need them for withdrawals"
echo "• Document the exit epoch for your records"
echo "• Your validator will continue to have duties until exit is processed"
echo ""

# Create exit record
EXIT_RECORD="exit_record_$(date +%Y%m%d_%H%M%S).txt"
cat > "$EXIT_RECORD" << EOF
Validator Exit Record
====================
Date: $(date)
Network: $(grep "^NETWORK=" .env | cut -d'=' -f2)
Current Epoch: $CURRENT_EPOCH
Validators Exited: $(echo -e "$SELECTED_VALIDATORS" | wc -l)

Validator Public Keys:
$(echo -e "$SELECTED_VALIDATORS" | nl -s '. ')

This is a record of your voluntary exit. Keep this file for your records.
EOF

echo -e "${GREEN}Exit record saved to: $EXIT_RECORD${NC}"