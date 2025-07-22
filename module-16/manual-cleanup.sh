#!/bin/bash
# Manual Cleanup Script for Hetzner Cloud Resources
# Uses hcloud CLI to remove all validator-related resources
# Use this when Terraform state is lost or corrupted

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║      HETZNER CLOUD MANUAL RESOURCE CLEANUP           ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if hcloud is installed
if ! command -v hcloud &> /dev/null; then
    echo -e "${RED}Error: hcloud CLI is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  brew install hcloud"
    echo ""
    echo "Then configure it with:"
    echo "  hcloud context create"
    exit 1
fi

# Check if hcloud is configured
if ! hcloud server list &> /dev/null; then
    echo -e "${RED}Error: hcloud is not configured${NC}"
    echo ""
    echo "Configure it with:"
    echo "  hcloud context create"
    echo "  (Enter your Hetzner API token when prompted)"
    exit 1
fi

# Function to list resources
list_resources() {
    echo -e "${BLUE}Current Hetzner Cloud Resources:${NC}"
    echo "════════════════════════════════════════════"
    
    echo -e "\n${YELLOW}SERVERS:${NC}"
    hcloud server list -o columns=id,name,status,created || echo "No servers found"
    
    echo -e "\n${YELLOW}VOLUMES:${NC}"
    hcloud volume list -o columns=id,name,size,server || echo "No volumes found"
    
    echo -e "\n${YELLOW}FIREWALLS:${NC}"
    hcloud firewall list -o columns=id,name || echo "No firewalls found"
    
    echo -e "\n${YELLOW}SSH KEYS:${NC}"
    hcloud ssh-key list -o columns=id,name || echo "No SSH keys found"
    echo ""
}

# Show current resources
list_resources

# Ask for confirmation
echo -e "${YELLOW}⚠️  WARNING: This will delete ALL resources shown above!${NC}"
echo ""
read -p "Are you sure you want to delete all these resources? Type 'DELETE ALL' to confirm: " confirm

if [ "$confirm" != "DELETE ALL" ]; then
    echo -e "${GREEN}Cleanup cancelled.${NC}"
    exit 0
fi

# Pattern to match (customize if needed)
PATTERN="${1:-eth-validator}"
echo ""
echo -e "${BLUE}Looking for resources matching pattern: '${PATTERN}'${NC}"

# Delete servers
echo -e "\n${YELLOW}Deleting servers...${NC}"
SERVER_IDS=$(hcloud server list -o columns=id,name | grep -E "${PATTERN}" | awk '{print $1}' || true)
if [ -n "$SERVER_IDS" ]; then
    for id in $SERVER_IDS; do
        echo -e "  Deleting server ID: $id"
        hcloud server delete "$id" || echo "  Failed to delete server $id"
    done
else
    echo "  No servers found matching pattern"
fi

# Delete volumes
echo -e "\n${YELLOW}Deleting volumes...${NC}"
VOLUME_IDS=$(hcloud volume list -o columns=id,name | grep -E "${PATTERN}" | awk '{print $1}' || true)
if [ -n "$VOLUME_IDS" ]; then
    for id in $VOLUME_IDS; do
        echo -e "  Deleting volume ID: $id"
        hcloud volume delete "$id" || echo "  Failed to delete volume $id"
    done
else
    echo "  No volumes found matching pattern"
fi

# Delete firewalls
echo -e "\n${YELLOW}Deleting firewalls...${NC}"
FIREWALL_IDS=$(hcloud firewall list -o columns=id,name | grep -E "${PATTERN}" | awk '{print $1}' || true)
if [ -n "$FIREWALL_IDS" ]; then
    for id in $FIREWALL_IDS; do
        echo -e "  Deleting firewall ID: $id"
        hcloud firewall delete "$id" || echo "  Failed to delete firewall $id"
    done
else
    echo "  No firewalls found matching pattern"
fi

# Delete SSH keys
echo -e "\n${YELLOW}Deleting SSH keys...${NC}"
SSH_KEY_IDS=$(hcloud ssh-key list -o columns=id,name | grep -E "${PATTERN}" | awk '{print $1}' || true)
if [ -n "$SSH_KEY_IDS" ]; then
    for id in $SSH_KEY_IDS; do
        echo -e "  Deleting SSH key ID: $id"
        hcloud ssh-key delete "$id" || echo "  Failed to delete SSH key $id"
    done
else
    echo "  No SSH keys found matching pattern"
fi

# Show remaining resources
echo ""
echo -e "${GREEN}Cleanup complete! Remaining resources:${NC}"
echo ""
list_resources

echo -e "${GREEN}✅ Manual cleanup finished!${NC}"
echo ""
echo "You can now:"
echo "1. Run 'cd terraform && ./deploy.sh' to start fresh"
echo "2. Or check Hetzner console to verify all resources are gone"