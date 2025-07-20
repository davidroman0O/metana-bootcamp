#!/bin/bash
# Test Ansible deployment to ensure fee recipient is correctly set

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Testing Ansible deployment for fee recipient fix...${NC}"
echo ""

# Get connection details from Terraform
cd "$(dirname "$0")/../terraform"
VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null)
SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null)
cd - > /dev/null

# Expected fee recipient (with 0x prefix as it should appear in docker-compose)
EXPECTED_FEE_RECIPIENT="0x92145c8e548A87DFd716b1FD037a5e476a1f2a86"

echo -e "${YELLOW}Checking deployed configuration on server...${NC}"
echo ""

# SSH to server and check
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'EOF'
echo "=== Checking docker-compose.yml ===" 
cd /home/validator/ethereum/eth-docker
echo "Fee recipient in docker-compose.yml:"
grep -n "fee-recipient" docker-compose.yml | head -1

echo ""
echo "=== Checking .env file ==="
echo "Fee recipient in .env:"
grep "VALIDATOR_FEE_RECIPIENT" .env

echo ""
echo "=== Checking running container ==="
if docker ps | grep -q "eth-docker-consensus-1"; then
    echo "Consensus container is running"
    echo "Container command line:"
    docker inspect eth-docker-consensus-1 | grep -A1 "fee-recipient" | head -2
else
    echo "WARNING: Consensus container is not running"
fi

echo ""
echo "=== Checking for errors ==="
docker-compose logs --tail=20 consensus | grep -iE "error|invalid|failed|bytes20" || echo "No critical errors found"
EOF

echo ""
echo -e "${GREEN}Test complete!${NC}"
echo ""
echo "Expected fee recipient: $EXPECTED_FEE_RECIPIENT"
echo ""
echo "=== WHAT TO LOOK FOR ==="
echo "✅ CORRECT: --validators-proposer-default-fee-recipient=0x92145c8e548A87DFd716b1FD037a5e476a1f2a86"
echo "❌ WRONG:   --validators-proposer-default-fee-recipient=833966730207027452188977208920783179573331176070"
echo ""
echo "If the fee recipient appears as a decimal number (starting with 8339...), the fix has NOT been applied correctly."
echo "If it appears as a hex address (starting with 0x92...), the fix is working!"
echo ""
echo "Note: The address is stored WITHOUT 0x in inventory/hosts.yml, but should appear WITH 0x in docker-compose.yml"