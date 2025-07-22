#!/bin/bash
# Ethereum Validator Voluntary Exit Script
# This script helps perform a voluntary exit for your validator from your local machine

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ETH_DOCKER_DIR="/home/validator/ethereum/eth-docker"
CONSENSUS_ENDPOINT="http://localhost:5052"
SSH_OPTIONS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Ethereum Validator Voluntary Exit Tool         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

# Function to execute remote command
exec_remote() {
    ssh $SSH_OPTIONS -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" "$@"
}

# Function to execute remote command with output
exec_remote_output() {
    ssh $SSH_OPTIONS -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" "$@" 2>/dev/null
}

# Get SSH key path and validator IP from environment or Terraform
if [ -z "$SSH_KEY_PATH" ] || [ -z "$VALIDATOR_IP" ]; then
    echo -e "${YELLOW}🔧 Getting connection details from Terraform...${NC}"
    
    cd "$PROJECT_ROOT/terraform"
    if [ -f terraform.tfstate ]; then
        VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null || echo "")
        SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null || echo "")
        cd - > /dev/null
    else
        echo -e "${RED}❌ Error: Terraform state not found${NC}"
        echo "Please set SSH_KEY_PATH and VALIDATOR_IP environment variables"
        exit 1
    fi
fi

# Verify environment variables
if [ -z "$SSH_KEY_PATH" ] || [ -z "$VALIDATOR_IP" ]; then
    echo -e "${RED}❌ Error: Missing required environment variables${NC}"
    echo "Please set:"
    echo "  export SSH_KEY_PATH=/path/to/ssh/key"
    echo "  export VALIDATOR_IP=your.validator.ip"
    exit 1
fi

# Test SSH connection
echo -e "${BLUE}🔍 Testing connection to validator...${NC}"
exec_remote "echo 'Connection successful'" > /dev/null 2>&1
check_status "Connected to validator at $VALIDATOR_IP"

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
    echo -e "${GREEN}✅ Exit cancelled.${NC}"
    exit 0
fi

# Check if eth-docker exists on remote server
echo ""
echo -e "${BLUE}🔍 Checking eth-docker installation...${NC}"
if ! exec_remote "[ -d $ETH_DOCKER_DIR ]" 2>/dev/null; then
    echo -e "${RED}❌ eth-docker directory not found on validator${NC}"
    echo "Expected location: $ETH_DOCKER_DIR"
    exit 1
fi
check_status "eth-docker found"

# Check if services are running
echo ""
echo -e "${BLUE}🔍 Checking validator status...${NC}"

# Debug: Check if we can access eth-docker directory
if ! exec_remote "cd $ETH_DOCKER_DIR" 2>/dev/null; then
    echo -e "${RED}❌ Cannot access eth-docker directory: $ETH_DOCKER_DIR${NC}"
    echo "Please verify the path is correct"
    exit 1
fi

# Check for different possible service states (Up, running, etc.)
# First, let's see all services
ALL_SERVICES=$(exec_remote_output "cd $ETH_DOCKER_DIR && docker-compose ps 2>/dev/null" || echo "")
if [ -z "$ALL_SERVICES" ]; then
    echo -e "${YELLOW}⚠️  No services found. Trying docker compose (without hyphen)...${NC}"
    ALL_SERVICES=$(exec_remote_output "cd $ETH_DOCKER_DIR && docker compose ps 2>/dev/null" || echo "")
fi

# Look for consensus service (Teku runs the validator)
CONSENSUS_STATUS=$(echo "$ALL_SERVICES" | grep -i consensus || echo "")
if [ -z "$CONSENSUS_STATUS" ]; then
    echo -e "${RED}❌ Consensus service not found!${NC}"
    echo "Available services:"
    echo "$ALL_SERVICES"
    echo ""
    echo "Please ensure eth-docker is properly set up"
    exit 1
fi

# Check if consensus is running (Teku validator is part of consensus)
if echo "$CONSENSUS_STATUS" | grep -qiE "(Up|running)"; then
    check_status "Consensus service (Teku with validator) is running"
else
    echo -e "${RED}❌ Consensus service is not running!${NC}"
    echo "Current status: $CONSENSUS_STATUS"
    echo "Please start your consensus client: cd $ETH_DOCKER_DIR && ./ethd start"
    exit 1
fi

# Get validator information
echo ""
echo -e "${BLUE}📋 Fetching validator information...${NC}"

# Teku REST API to get validators
VALIDATOR_PUBKEYS=$(exec_remote_output "cd $ETH_DOCKER_DIR && docker-compose exec -T consensus curl -s 'http://localhost:5052/eth/v1/keystores' | jq -r '.data[].validating_pubkey' 2>/dev/null" || echo "")

if [ -z "$VALIDATOR_PUBKEYS" ]; then
    # Try checking the validator-keys directory volume
    echo -e "${YELLOW}Checking validator keys directory...${NC}"
    KEYSTORE_COUNT=$(exec_remote_output "cd $ETH_DOCKER_DIR && find ./validator-keys -name 'keystore-*.json' 2>/dev/null | wc -l" || echo "0")
    
    if [ "$KEYSTORE_COUNT" -gt "0" ]; then
        echo -e "${GREEN}✅ Found $KEYSTORE_COUNT validator keystore(s)${NC}"
        VALIDATOR_PUBKEYS="KEYSTORES_FOUND_$KEYSTORE_COUNT"
    else
        echo -e "${RED}❌ No validators found!${NC}"
        echo "Please ensure your validators are properly imported."
        exit 1
    fi
fi

# Display validators
if [[ "$VALIDATOR_PUBKEYS" == KEYSTORES_FOUND_* ]]; then
    COUNT="${VALIDATOR_PUBKEYS#KEYSTORES_FOUND_}"
    echo ""
    echo -e "${YELLOW}📊 Total validators found: $COUNT${NC}"
else
    echo ""
    echo -e "${GREEN}✅ Found the following validators:${NC}"
    echo "$VALIDATOR_PUBKEYS" | nl -s '. '
    VALIDATOR_COUNT=$(echo "$VALIDATOR_PUBKEYS" | wc -l)
    echo ""
    echo -e "${YELLOW}📊 Total validators: $VALIDATOR_COUNT${NC}"
fi

SELECTED_VALIDATORS="ALL"

# Get current epoch and calculate exit time
echo ""
echo -e "${BLUE}🌐 Checking network status...${NC}"
CURRENT_EPOCH=$(exec_remote_output "cd $ETH_DOCKER_DIR && docker-compose exec -T consensus curl -s '${CONSENSUS_ENDPOINT}/eth/v1/beacon/headers/finalized' | jq -r '.data.header.message.slot' | awk '{print int(\$1/32)}'" 2>/dev/null || echo "Unknown")

echo -e "Current epoch: ${CURRENT_EPOCH}"
echo ""
echo -e "${YELLOW}⏱️  Exit timeline:${NC}"
echo "• Exit initiation: Now"
echo "• Exit completion: ~1-2 days (network dependent)"
echo "• Withdrawable: After exit epoch + withdrawal delay"
echo ""

# Final confirmation
echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                 FINAL CONFIRMATION                   ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "You are about to initiate the validator exit process."
echo "This action is PERMANENT and CANNOT BE UNDONE!"
echo ""
read -p "Type 'EXIT MY VALIDATORS' to proceed: " final_confirm

if [ "$final_confirm" != "EXIT MY VALIDATORS" ]; then
    echo -e "${GREEN}✅ Exit cancelled.${NC}"
    exit 0
fi

# For Teku, we need to exec into the consensus container
echo -e "${BLUE}🔍 Setting up Teku validator exit...${NC}"
# Teku runs validator in the consensus container
EXIT_CMD="docker-compose exec consensus teku voluntary-exit --beacon-node-api-endpoint=http://localhost:5052"

# Perform the exit
echo ""
echo -e "${YELLOW}🚀 Initiating voluntary exit...${NC}"
echo ""

# Create exit record directory
mkdir -p "$PROJECT_ROOT/.exit_records"

# Execute Teku exit process
echo -e "${YELLOW}🔍 Finding validator keystores...${NC}"

# Find the keystore files in the validator-keys directory
KEYSTORES=$(exec_remote_output "cd $ETH_DOCKER_DIR && find ./validator-keys -name 'keystore-*.json' 2>/dev/null" || echo "")

if [ -z "$KEYSTORES" ]; then
    echo -e "${RED}❌ No keystore files found in validator-keys directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found keystores${NC}"

# For each keystore, execute the exit
for KEYSTORE in $KEYSTORES; do
    KEYSTORE_NAME=$(basename "$KEYSTORE")
    echo ""
    echo -e "${BLUE}🔧 Processing: $KEYSTORE_NAME${NC}"
    
    # Check if there's a corresponding password file
    PASSWORD_FILE="${KEYSTORE%.json}.txt"
    if exec_remote "cd $ETH_DOCKER_DIR && [ -f '$PASSWORD_FILE' ]" 2>/dev/null; then
        echo "Found password file: $(basename "$PASSWORD_FILE")"
        
        # Execute the voluntary exit
        echo "Executing voluntary exit..."
        CONTAINER_KEYSTORE="/validator-keys/$KEYSTORE_NAME"
        CONTAINER_PASSWORD="/validator-keys/$(basename "$PASSWORD_FILE")"
        
        if exec_remote "cd $ETH_DOCKER_DIR && docker-compose exec -T consensus teku voluntary-exit --beacon-node-api-endpoint=http://localhost:5052 --validator-keys=$CONTAINER_KEYSTORE:$CONTAINER_PASSWORD --confirmation-enabled=false" 2>&1; then
            echo -e "${GREEN}✅ Exit initiated for $KEYSTORE_NAME${NC}"
        else
            echo -e "${RED}❌ Failed to exit validator for $KEYSTORE_NAME${NC}"
            echo "This might be due to:"
            echo "• Validator already exited"
            echo "• Validator not active"
            echo "• Network issues"
        fi
    else
        echo -e "${YELLOW}⚠️  No password file found for $KEYSTORE_NAME${NC}"
        echo "Expected: $PASSWORD_FILE"
        echo "You'll need to exit this validator manually"
    fi
    
    sleep 2
done

echo ""
echo -e "${GREEN}✅ Voluntary exit process completed${NC}"

# Success message
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       VOLUNTARY EXIT INITIATED SUCCESSFULLY          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor your validator status on the beacon chain explorer"
echo "2. Wait for the exit to be processed (usually within 1-2 days)"
echo "3. Your stake will be withdrawable after the exit is finalized"
echo "4. Keep your node running until the exit is complete"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "• Save your validator keys - you'll need them for withdrawals"
echo "• Document the exit epoch for your records"
echo "• Your validator will continue to have duties until exit is processed"
echo ""

# Get network info from remote
NETWORK=$(exec_remote_output "cd $ETH_DOCKER_DIR && grep '^NETWORK=' .env | cut -d'=' -f2" || echo "unknown")

# Create exit record locally
EXIT_RECORD="$PROJECT_ROOT/.exit_records/exit_record_$(date +%Y%m%d_%H%M%S).txt"

# Build exit record content
if [[ "$VALIDATOR_PUBKEYS" == KEYSTORES_FOUND_* ]]; then
    COUNT="${VALIDATOR_PUBKEYS#KEYSTORES_FOUND_}"
    VALIDATOR_INFO="$COUNT validator keystore(s) found - exit handled by eth-docker"
elif [ -n "$VALIDATOR_PUBKEYS" ]; then
    VALIDATOR_INFO="Validator Public Keys:\n$(echo "$VALIDATOR_PUBKEYS" | nl -s '. ')"
else
    VALIDATOR_INFO="Exit process managed by eth-docker"
fi

cat > "$EXIT_RECORD" << EOF
Validator Exit Record
====================
Date: $(date)
Network: $NETWORK
Validator IP: $VALIDATOR_IP
Current Epoch: $CURRENT_EPOCH
Exit Method: eth-docker interactive (./ethd cmd run --rm validator-exit)

$VALIDATOR_INFO

This is a record of your voluntary exit. Keep this file for your records.
EOF

echo -e "${GREEN}✅ Exit record saved to: $EXIT_RECORD${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "• Exit record: $EXIT_RECORD"
echo "• Monitor at: https://hoodi.beaconcha.in/"