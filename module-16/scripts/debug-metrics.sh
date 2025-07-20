#!/bin/bash
# Debug metrics availability

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Debugging metrics availability...${NC}"
echo ""

# Get connection details from Terraform
cd "$(dirname "$0")/../terraform"
VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null)
SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null)
cd - > /dev/null

# SSH to server
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'EOF'
cd /home/validator/ethereum/eth-docker

echo -e "\033[1;33m=== Container Status ===\033[0m"
docker-compose ps

echo ""
echo -e "\033[1;33m=== Checking Teku Metrics ===\033[0m"
echo "Trying to access Teku metrics endpoint..."
if curl -s http://localhost:8008/metrics > /dev/null 2>&1; then
    echo "✅ Teku metrics endpoint is accessible"
    echo "Sample Teku metrics:"
    curl -s http://localhost:8008/metrics | grep -E "^beacon_|^teku_|^libp2p_|^jvm_" | grep -v "^#" | head -20
else
    echo "❌ Cannot access Teku metrics on port 8008"
    echo "Checking Teku container logs:"
    docker-compose logs --tail=20 consensus | grep -E "metrics|8008|port"
fi

echo ""
echo -e "\033[1;33m=== Checking Nethermind Metrics ===\033[0m"
echo "Trying to access Nethermind metrics endpoint..."
if curl -s http://localhost:9545/metrics > /dev/null 2>&1; then
    echo "✅ Nethermind metrics endpoint is accessible"
    echo "Sample Nethermind metrics:"
    curl -s http://localhost:9545/metrics | grep -E "^nethermind_" | grep -v "^#" | head -20
else
    echo "❌ Cannot access Nethermind metrics on port 9545"
    echo "Checking Nethermind container logs:"
    docker-compose logs --tail=20 execution | grep -E "metrics|9545|port"
fi

echo ""
echo -e "\033[1;33m=== Checking Node Exporter Metrics ===\033[0m"
echo "Node exporter metrics count:"
curl -s http://localhost:9100/metrics | grep -v "^#" | wc -l

echo ""
echo -e "\033[1;33m=== Prometheus Configuration ===\033[0m"
echo "Current Prometheus scrape configs:"
cat prometheus/prometheus.yml

echo ""
echo -e "\033[1;33m=== Testing Direct Container Access ===\033[0m"
echo "Testing metrics directly from containers..."
echo ""
echo "Teku metrics from container:"
docker exec eth-docker-consensus-1 curl -s http://localhost:8008/metrics | grep -E "^beacon_|^teku_" | head -5 || echo "Failed to access Teku metrics from inside container"

echo ""
echo "Nethermind metrics from container:"
docker exec eth-docker-execution-1 curl -s http://localhost:9545/metrics | grep -E "^nethermind_" | head -5 || echo "Failed to access Nethermind metrics from inside container"

echo ""
echo -e "\033[1;33m=== Network Connectivity Check ===\033[0m"
docker network ls | grep eth-docker
docker network inspect eth-docker | jq '.Containers' | head -50

EOF

echo ""
echo -e "${GREEN}Debug complete!${NC}"