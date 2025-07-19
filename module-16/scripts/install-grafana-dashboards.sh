#!/bin/bash
# Install Grafana dashboards on existing validator

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

echo -e "${BLUE}Installing Grafana dashboards on ${VALIDATOR_IP}...${NC}"
echo ""

# SSH to server and install dashboards
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" validator@"$VALIDATOR_IP" << 'EOF'
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

cd ~/ethereum/eth-docker

echo -e "${GREEN}1. Creating dashboard directories...${NC}"
mkdir -p grafana/dashboards

echo ""
echo -e "${GREEN}2. Downloading Ethereum monitoring dashboards...${NC}"

# Dashboard list with IDs and revisions
declare -A dashboards=(
    ["besu-overview"]="10273:3"
    ["teku-overview"]="12199:1"
    ["ethereum-validators"]="13481:1"
    ["node-exporter"]="1860:37"
    ["besu-full"]="16455:3"
    ["teku-dashboard"]="13457:2"
)

for name in "${!dashboards[@]}"; do
    IFS=':' read -r id revision <<< "${dashboards[$name]}"
    echo "   Downloading $name (ID: $id)..."
    curl -s "https://grafana.com/api/dashboards/${id}/revisions/${revision}/download" \
        -o "grafana/dashboards/${name}.json"
    
    # Fix datasource references
    sed -i 's/${DS_PROMETHEUS}/Prometheus/g' "grafana/dashboards/${name}.json"
done

echo ""
echo -e "${GREEN}3. Updating Grafana provisioning...${NC}"

# Update dashboard provisioner to use correct path
cat > grafana/provisioning/dashboards/dashboard.yml << 'YAML'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    folderUid: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
YAML

echo ""
echo -e "${GREEN}4. Updating docker-compose to mount dashboards...${NC}"

# Check if dashboards volume is already mounted
if ! grep -q "/var/lib/grafana/dashboards" docker-compose.yml; then
    # Add dashboard volume mount to Grafana service
    sed -i '/grafana-data:\/var\/lib\/grafana/a\      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro' docker-compose.yml
fi

echo ""
echo -e "${GREEN}5. Restarting Grafana to load dashboards...${NC}"
docker-compose restart grafana

echo ""
echo -e "${GREEN}6. Waiting for Grafana to restart...${NC}"
sleep 10

echo ""
echo -e "${GREEN}7. Verifying Grafana is running...${NC}"
docker-compose ps grafana

echo ""
echo -e "${BLUE}Available dashboards:${NC}"
echo "  • Besu Overview - Execution client metrics"
echo "  • Teku Overview - Consensus client metrics"
echo "  • Ethereum Validators - Validator performance"
echo "  • Node Exporter - System metrics"
echo "  • Besu Full - Detailed execution metrics"
echo "  • Teku Dashboard - Detailed consensus metrics"
EOF

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     GRAFANA DASHBOARDS INSTALLED SUCCESSFULLY!       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Access Grafana to see your new dashboards:${NC}"
echo -e "${BLUE}http://localhost:3000${NC}"
echo ""
echo "The dashboards will appear in the Dashboards menu."
echo "They are pre-configured to use your Prometheus datasource."