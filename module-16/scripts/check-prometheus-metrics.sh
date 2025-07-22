#!/bin/bash
# Check Prometheus metrics availability

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Checking Prometheus metrics availability...${NC}"
echo ""

# Get connection details from Terraform
cd "$(dirname "$0")/../terraform"
VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null)
SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null)
cd - > /dev/null

# SSH to server
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'EOF'
cd /home/validator/ethereum/eth-docker

echo -e "\033[1;33m=== Prometheus Targets Status ===\033[0m"
curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[] | "\(.labels.job): \(.health) - Last scrape: \(.lastScrape)"'

echo ""
echo -e "\033[1;33m=== Key Metrics Available ===\033[0m"

echo ""
echo "1. Node Exporter Metrics (System):"
echo "   Memory:"
curl -s http://localhost:9100/metrics | grep -E "^node_memory_" | grep -v "#" | head -5
echo "   CPU:"
curl -s http://localhost:9100/metrics | grep -E "^node_cpu_" | grep -v "#" | head -3
echo "   Disk:"
curl -s http://localhost:9100/metrics | grep -E "^node_filesystem_" | grep -v "#" | head -3
echo "   Network:"
curl -s http://localhost:9100/metrics | grep -E "^node_network_" | grep -v "#" | head -3

echo ""
echo "2. Teku Consensus Client Metrics:"
echo "   Beacon chain:"
curl -s http://localhost:8008/metrics | grep -E "^beacon_" | grep -v "#" | head -5
echo "   Libp2p:"
curl -s http://localhost:8008/metrics | grep -E "^libp2p_" | grep -v "#" | head -3
echo "   JVM Memory:"
curl -s http://localhost:8008/metrics | grep -E "^jvm_memory_" | grep -v "#" | head -3
echo "   Process:"
curl -s http://localhost:8008/metrics | grep -E "^process_" | grep -v "#" | head -3

echo ""
echo "3. Nethermind Execution Client Metrics:"
echo "   Sync status:"
curl -s http://localhost:9545/metrics | grep -E "^nethermind_sync" | grep -v "#" | head -3
echo "   Blocks:"
curl -s http://localhost:9545/metrics | grep -E "^nethermind_blocks" | grep -v "#" | head -3
echo "   Network:"
curl -s http://localhost:9545/metrics | grep -E "^nethermind_network" | grep -v "#" | head -3

echo ""
echo -e "\033[1;33m=== Metric Counts ===\033[0m"
echo "Total metrics per service:"
echo -n "  Node Exporter: "
curl -s http://localhost:9100/metrics | grep -v "^#" | wc -l
echo -n "  Teku: "
curl -s http://localhost:8008/metrics | grep -v "^#" | wc -l
echo -n "  Nethermind: "
curl -s http://localhost:9545/metrics | grep -v "^#" | wc -l

echo ""
echo -e "\033[1;33m=== Common Issues ===\033[0m"
# Check for swap
if [ $(swapon -s | wc -l) -eq 0 ]; then
    echo "⚠️  No swap configured - SWAP metrics will show N/A (this is normal)"
else
    echo "✅ Swap is configured"
fi

# Check if consensus is synced
SLOT=$(curl -s http://localhost:8008/metrics | grep 'beacon_slot{' | grep -v "#" | awk '{print $2}')
if [ -n "$SLOT" ]; then
    echo "✅ Consensus client is syncing - current slot: $SLOT"
else
    echo "⚠️  Consensus client may still be starting up"
fi

EOF

echo ""
echo -e "${GREEN}Metrics check complete!${NC}"
echo ""
echo "To view Grafana dashboards:"
echo "1. Create SSH tunnel: ssh -L 3000:localhost:3000 -i $SSH_KEY_PATH root@$VALIDATOR_IP"
echo "2. Open browser: http://localhost:3000"