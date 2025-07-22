#!/bin/bash
# Script to fix Teku keystore lock file issue
# Why this script? 
# Well during the night, the Teku crashed and left a lock file in the keystore directory.
# So hopefully i saw the logs form the container and made this script to fix it.
# This script is a reminder that, eventually, if you only have one validator, you can just add `--validators-keystore-locking-enabled=false` to the Teku command line.

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Teku Lock File Fix Tool                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Get connection details from Terraform
if [ -d "../terraform" ]; then
    cd ../terraform
    VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null)
    SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null)
    cd - > /dev/null
else
    echo -e "${RED}Error: Could not find terraform directory${NC}"
    exit 1
fi

# Convert relative SSH key path to absolute
if [ -n "$SSH_KEY_PATH" ] && [[ "$SSH_KEY_PATH" == ./* ]]; then
    SSH_KEY_PATH="${SSH_KEY_PATH#./}"
    SSH_KEY_PATH="../terraform/$SSH_KEY_PATH"
fi

echo -e "${YELLOW}This will fix the Teku keystore lock file issue.${NC}"
echo -e "${RED}⚠️  WARNING: Only proceed if you're SURE no other validator is using these keys!${NC}"
echo ""
read -p "Continue? (y/n): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${GREEN}Connecting to validator at ${VALIDATOR_IP}...${NC}"

ssh -i "$SSH_KEY_PATH" validator@"$VALIDATOR_IP" << 'REMOTE_SCRIPT'
#!/bin/bash

cd /home/validator/ethereum/eth-docker

echo "1. Stopping consensus client..."
docker-compose stop consensus

# Wait for complete shutdown
echo "2. Waiting for consensus to fully stop..."
sleep 10

echo "3. Checking for lock files..."
LOCK_FILES=$(find validator-keys -name "*.lock" 2>/dev/null || true)

if [ -z "$LOCK_FILES" ]; then
    echo "No lock files found."
else
    echo "Found lock files:"
    echo "$LOCK_FILES"
    echo ""
    echo "4. Removing lock files..."
    sudo rm -f validator-keys/*.lock
    echo "✓ Lock files removed"
fi

echo ""
echo "5. Checking validator-keys directory permissions..."
ls -la validator-keys/

echo ""
echo "6. Setting correct permissions..."
sudo chown -R 1000:1000 validator-keys/
sudo chmod -R 600 validator-keys/keystore*
sudo chmod 755 validator-keys/
echo "✓ Permissions fixed"

echo ""
echo "7. Starting consensus client..."
docker-compose up -d consensus

echo ""
echo "8. Waiting for startup..."
sleep 15

echo ""
echo "9. Checking consensus logs..."
docker-compose logs --tail=20 consensus | grep -E "(Loading.*validator|FATAL|ERROR|Successfully)" || echo "Check complete"

echo ""
echo "✓ Fix complete!"
echo ""
echo "Monitor the logs with:"
echo "docker-compose logs -f consensus"

REMOTE_SCRIPT

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Fix Applied Successfully!               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Monitor the consensus client logs"
echo "2. Verify your validator is attesting properly"
echo "3. Check beaconcha.in for your validator status"
echo ""
echo -e "${BLUE}To prevent this in the future, consider:${NC}"
echo "- Adding a restart delay in docker-compose.yml"
echo "- Setting --validators-keystore-locking-enabled=false (less secure)"
echo "- Ensuring proper shutdown procedures"