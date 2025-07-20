#!/bin/bash
# Server Reset Script - Cleans the validator server for fresh deployment
# This allows you to re-run Ansible for a clean installation

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

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Validator Server Reset Script               ║${NC}"
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

# Get connection details from Terraform
echo -e "${YELLOW}Getting connection details from Terraform...${NC}"
cd "$PROJECT_ROOT/terraform"
if [ ! -f terraform.tfstate ]; then
    echo -e "${RED}Error: Terraform state not found${NC}"
    echo "Please ensure you've deployed the infrastructure first"
    exit 1
fi

VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null || echo "")
SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null || echo "")
cd - > /dev/null

if [ -z "$VALIDATOR_IP" ] || [ -z "$SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: Could not get connection details from Terraform${NC}"
    exit 1
fi

echo -e "${GREEN}Connection Details:${NC}"
echo "  Server IP: $VALIDATOR_IP"
echo "  SSH Key: $SSH_KEY_PATH"
echo ""

# Check current server state
echo -e "${BLUE}Checking current server state...${NC}"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'EOF' || true
if [ -d "/home/validator/ethereum/eth-docker" ]; then
    echo "Found eth-docker installation"
    cd /home/validator/ethereum/eth-docker
    docker-compose ps 2>/dev/null || echo "No running containers"
    
    echo ""
    echo "Validator keys present:"
    ls -la validator-keys/ 2>/dev/null | grep -c keystore || echo "No validator keys found"
fi
EOF

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will reset the server to a clean state!${NC}"
echo "This operation will:"
echo "  - Stop all running containers"
echo "  - Remove all Docker containers and images"
echo "  - Delete blockchain data (execution and consensus)"
echo "  - Delete monitoring data (Grafana/Prometheus)"
echo "  - Remove eth-docker installation"
echo ""
echo -e "${GREEN}This will NOT affect:${NC}"
echo "  - Your validator keys (they're safe locally)"
echo "  - The server itself (remains running)"
echo "  - Network configuration"
echo ""
read -p "Are you sure you want to reset the server? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Reset cancelled"
    exit 1
fi

# Create reset script on server
echo ""
echo -e "${BLUE}Creating reset script on server...${NC}"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'RESET_SCRIPT'
cat > /tmp/reset-validator.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting server reset..."

# Stop all containers
if [ -d "/home/validator/ethereum/eth-docker" ]; then
    echo "Stopping eth-docker containers..."
    cd /home/validator/ethereum/eth-docker
    docker-compose down -v || true
    cd /
fi

# Remove all Docker containers
echo "Removing all Docker containers..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove Docker images
echo "Removing Docker images..."
docker rmi $(docker images -q) 2>/dev/null || true

# Clean Docker system
echo "Cleaning Docker system..."
docker system prune -a -f --volumes || true

# Remove eth-docker
if [ -d "/home/validator/ethereum" ]; then
    echo "Removing eth-docker installation..."
    rm -rf /home/validator/ethereum
fi

# Clean blockchain data
echo "Cleaning blockchain data..."
rm -rf /mnt/HC_Volume_*/execution/* 2>/dev/null || true
rm -rf /mnt/HC_Volume_*/consensus/* 2>/dev/null || true
rm -rf /mnt/HC_Volume_*/teku/* 2>/dev/null || true
rm -rf /mnt/HC_Volume_*/validator/* 2>/dev/null || true

# Clean Docker volumes
echo "Cleaning Docker volumes..."
rm -rf /var/lib/docker/volumes/* 2>/dev/null || true

# Reset validator user home
if [ -d "/home/validator" ]; then
    echo "Cleaning validator home directory..."
    rm -rf /home/validator/.cache 2>/dev/null || true
    rm -rf /home/validator/.docker 2>/dev/null || true
    rm -rf /home/validator/validator_keys_* 2>/dev/null || true
fi

echo "Server reset complete!"
EOF

chmod +x /tmp/reset-validator.sh
RESET_SCRIPT

# Execute reset
echo -e "${BLUE}Executing server reset...${NC}"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" "/tmp/reset-validator.sh"
check_status "Server reset"

# Verify reset
echo ""
echo -e "${BLUE}Verifying reset...${NC}"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'EOF'
echo "Docker containers:"
docker ps -a | wc -l
echo ""
echo "Docker images:"
docker images | wc -l
echo ""
echo "Validator home:"
ls -la /home/validator/ 2>/dev/null || echo "Clean"
echo ""
echo "Data volumes:"
ls -la /mnt/HC_Volume_*/ 2>/dev/null || echo "Clean"
EOF

# Clean up
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" "rm -f /tmp/reset-validator.sh"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ SERVER RESET COMPLETE!                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "The server has been reset to a clean state."
echo ""
echo -e "${YELLOW}To redeploy with Ansible:${NC}"
echo ""
echo "1. Deploy with Nethermind (automatic - no prompts!):"
echo -e "   ${BLUE}cd $PROJECT_ROOT/ansible${NC}"
echo -e "   ${BLUE}./configure-validator.sh${NC}"
echo ""
echo "2. Or deploy with different options:"
echo -e "   ${BLUE}EXECUTION_CLIENT=besu ./configure-validator.sh${NC}"
echo -e "   ${BLUE}AUTO_CONFIRM=false ./configure-validator.sh${NC}  # Interactive mode"
echo ""
echo "3. Transfer validator keys after deployment:"
echo -e "   ${BLUE}cd $PROJECT_ROOT/scripts${NC}"
echo -e "   ${BLUE}./transfer-validator-keys.sh${NC}"
echo ""
echo -e "${GREEN}The server is ready for fresh deployment!${NC}"