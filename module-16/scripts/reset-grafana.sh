#!/bin/bash
# Reset Grafana completely on the validator server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get server details from Terraform
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/../terraform"

VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null || echo "")
SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null || echo "")

if [ -z "$VALIDATOR_IP" ] || [ -z "$SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: Could not get server details from Terraform${NC}"
    exit 1
fi

# Convert relative path to absolute if needed
if [[ "$SSH_KEY_PATH" == ./* ]] || [[ "$SSH_KEY_PATH" != /* ]]; then
    SSH_KEY_PATH="${SSH_KEY_PATH#./}"
    SSH_KEY_PATH="$(pwd)/$SSH_KEY_PATH"
fi

# Generate new password
NEW_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)

echo -e "${BLUE}Resetting Grafana on ${VALIDATOR_IP}...${NC}"
echo ""

# SSH to server and reset Grafana
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" validator@"$VALIDATOR_IP" << EOF
set -e

cd ~/ethereum/eth-docker

echo "Stopping Grafana..."
docker-compose stop grafana

echo "Removing old Grafana database (to clear login blocks)..."
docker exec eth-docker-grafana-1 rm -f /var/lib/grafana/grafana.db || true

echo "Updating docker-compose.yml to include password..."
# Fix the docker-compose.yml to include the password environment variable
sed -i '/GF_SECURITY_ADMIN_USER=admin/a\      - GF_SECURITY_ADMIN_PASSWORD=${NEW_PASSWORD}' docker-compose.yml

echo "Starting Grafana with new configuration..."
docker-compose up -d grafana

echo "Waiting for Grafana to start..."
sleep 10

echo "Checking new logs..."
docker logs --tail=10 eth-docker-grafana-1

echo ""
echo "Service status:"
docker-compose ps grafana
EOF

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           GRAFANA RESET COMPLETE!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 New Grafana Credentials${NC}"
echo "═══════════════════════════════════════"
echo -e "URL:      ${YELLOW}http://localhost:3000${NC}"
echo -e "Username: ${YELLOW}admin${NC}"
echo -e "Password: ${YELLOW}${NEW_PASSWORD}${NC}"
echo ""
echo -e "${BLUE}SSH Tunnel Command:${NC}"
echo -e "${YELLOW}ssh -i $SSH_KEY_PATH -L 3000:localhost:3000 validator@$VALIDATOR_IP${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Save the password above!${NC}"

# Save to file
echo "Grafana Admin Password: ${NEW_PASSWORD}" > grafana-password.txt
echo -e "${BLUE}Password also saved to: grafana-password.txt${NC}"