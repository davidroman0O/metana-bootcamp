#!/bin/bash
# Validator Key Transfer Script
# This script safely transfers validator keys to the server and sets up proper permissions

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
echo -e "${BLUE}║           Validator Key Transfer Script              ║${NC}"
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

# Check if we're in the scripts directory
if [ ! -f "generate-keys.sh" ]; then
    echo -e "${RED}Error: This script must be run from the scripts directory${NC}"
    echo "Please run: cd scripts && ./transfer-validator-keys.sh"
    exit 1
fi

# Get SSH key path and validator IP from environment or Terraform
if [ -z "$SSH_KEY_PATH" ] || [ -z "$VALIDATOR_IP" ]; then
    echo -e "${YELLOW}Getting connection details from Terraform...${NC}"
    
    cd ../terraform
    if [ -f terraform.tfstate ]; then
        VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null || echo "")
        SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null || echo "")
        cd - > /dev/null
    else
        echo -e "${RED}Error: Terraform state not found${NC}"
        echo "Please set SSH_KEY_PATH and VALIDATOR_IP environment variables"
        exit 1
    fi
fi

# Verify environment variables
if [ -z "$SSH_KEY_PATH" ] || [ -z "$VALIDATOR_IP" ]; then
    echo -e "${RED}Error: Missing required environment variables${NC}"
    echo "Please set:"
    echo "  export SSH_KEY_PATH=/path/to/ssh/key"
    echo "  export VALIDATOR_IP=your.server.ip"
    exit 1
fi

echo -e "${GREEN}Connection Details:${NC}"
echo "  SSH Key: $SSH_KEY_PATH"
echo "  Server IP: $VALIDATOR_IP"
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY_PATH${NC}"
    exit 1
fi

# Find validator keys directories in .keys folder
echo -e "${BLUE}Looking for validator keys...${NC}"
KEY_DIRS=$(find "$PROJECT_ROOT/.keys" -maxdepth 1 -type d -name "validator_keys_*" 2>/dev/null || true)

if [ -z "$KEY_DIRS" ]; then
    echo -e "${YELLOW}No keys found in .keys directory, checking scripts directory...${NC}"
    # Fallback to check scripts directory for backward compatibility
    KEY_DIRS=$(find "$SCRIPT_DIR" -maxdepth 1 -type d -name "validator_keys_*" 2>/dev/null || true)
fi

if [ -z "$KEY_DIRS" ]; then
    echo -e "${RED}Error: No validator keys found${NC}"
    echo "Please generate keys first with: ./generate-keys.sh"
    echo "Keys should be in: $PROJECT_ROOT/.keys/"
    exit 1
fi

echo -e "${GREEN}Found validator keys:${NC}"
echo "$KEY_DIRS"
echo ""

# Test SSH connection
echo -e "${BLUE}Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" "echo 'SSH connection successful'" 2>/dev/null; then
    check_status "SSH connection test"
else
    echo -e "${RED}Cannot connect to server${NC}"
    echo "Please check:"
    echo "1. Server is running"
    echo "2. Your IP is allowed in firewall"
    echo "3. SSH key is correct"
    exit 1
fi

# Setup validator user on server
echo ""
echo -e "${BLUE}Setting up validator user on server...${NC}"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'SETUP_SCRIPT'
set -e

# Check if validator user exists
if ! id validator &>/dev/null; then
    echo "Creating validator user..."
    useradd -m -s /bin/bash validator
    usermod -aG docker,sudo validator
    echo "validator ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/validator
    echo "Validator user created"
else
    echo "Validator user already exists"
fi

# Ensure directories exist
echo "Creating directory structure..."
mkdir -p /home/validator/ethereum/keys
mkdir -p /home/validator/ethereum/eth-docker/validator-keys
chown -R validator:validator /home/validator

# Set proper permissions
chmod 755 /home/validator
chmod 755 /home/validator/ethereum
chmod 755 /home/validator/ethereum/keys

echo "Directory structure ready"
ls -la /home/validator/
SETUP_SCRIPT
check_status "Validator user setup"

# Transfer keys
echo ""
echo -e "${BLUE}Transferring validator keys to server...${NC}"
for key_dir in $KEY_DIRS; do
    echo "Transferring $key_dir..."
    scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" -r "$key_dir" root@"$VALIDATOR_IP":/home/validator/
    check_status "Transfer of $key_dir"
done

# Fix permissions on server
echo ""
echo -e "${BLUE}Setting proper permissions...${NC}"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'PERMISSION_SCRIPT'
set -e

# Change ownership of transferred keys
chown -R validator:validator /home/validator/validator_keys_*

# Set secure permissions
find /home/validator/validator_keys_* -type f -name "keystore-*" -exec chmod 600 {} \;
find /home/validator/validator_keys_* -type f -name "deposit_data-*" -exec chmod 644 {} \;

# List transferred files
echo "Transferred files:"
ls -la /home/validator/validator_keys_*/
PERMISSION_SCRIPT
check_status "Permission setup"

# Copy keys to eth-docker location
echo ""
echo -e "${BLUE}Copying keys to eth-docker...${NC}"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'COPY_SCRIPT'
set -e

# Check if eth-docker exists
if [ -d "/home/validator/ethereum/eth-docker" ]; then
    echo "Found eth-docker, copying validator keys..."
    
    # Copy all keystore files
    for key_dir in /home/validator/validator_keys_*/validator_keys; do
        if [ -d "$key_dir" ]; then
            cp -r "$key_dir"/* /home/validator/ethereum/eth-docker/validator-keys/ 2>/dev/null || true
        fi
    done
    
    # Set ownership for Docker containers (UID 1000)
    chown -R 1000:1000 /home/validator/ethereum/eth-docker/validator-keys/
    chmod 600 /home/validator/ethereum/eth-docker/validator-keys/keystore* 2>/dev/null || true
    
    echo "Keys copied to eth-docker"
    ls -la /home/validator/ethereum/eth-docker/validator-keys/
else
    echo "eth-docker not found. Keys are in /home/validator/"
    echo "Run Ansible configuration to set up eth-docker"
fi
COPY_SCRIPT
check_status "eth-docker key setup"

# Copy import script to server
echo ""
echo -e "${BLUE}Copying import script to server...${NC}"

# First copy to home directory
scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "$SCRIPT_DIR/import-validator-keys.sh" root@"$VALIDATOR_IP":/home/validator/
check_status "Import script transfer"

# Then copy to eth-docker if it exists
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$VALIDATOR_IP" << 'COPY_IMPORT_SCRIPT'
set -e

# Set permissions on the script
chmod +x /home/validator/import-validator-keys.sh
chown validator:validator /home/validator/import-validator-keys.sh

# Copy to eth-docker if it exists
if [ -d "/home/validator/ethereum/eth-docker" ]; then
    cp /home/validator/import-validator-keys.sh /home/validator/ethereum/eth-docker/
    chown validator:validator /home/validator/ethereum/eth-docker/import-validator-keys.sh
    chmod +x /home/validator/ethereum/eth-docker/import-validator-keys.sh
    echo "Import script copied to eth-docker directory"
else
    echo "eth-docker not found yet. Script available in home directory"
fi
COPY_IMPORT_SCRIPT
check_status "Import script setup"

# Success message
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✅ KEY TRANSFER COMPLETE!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Connect to your server:"
echo -e "   ${YELLOW}ssh -i $SSH_KEY_PATH root@$VALIDATOR_IP${NC}"
echo ""
echo "2. Switch to validator user:"
echo -e "   ${YELLOW}su - validator${NC}"
echo ""
echo "3. Import keys into eth-docker:"
echo -e "   ${YELLOW}cd ethereum/eth-docker${NC}"
echo -e "   ${YELLOW}./import-validator-keys.sh${NC}"
echo ""
echo "4. Verify keys are imported:"
echo -e "   ${YELLOW}docker-compose logs consensus | grep -i key${NC}"
echo ""
echo -e "${BLUE}Keys are stored in:${NC}"
echo "  - /home/validator/validator_keys_*/ (backup)"
echo "  - /home/validator/ethereum/eth-docker/validator-keys/ (active)"
echo ""
echo -e "${RED}Remember: Keep your local key backups safe!${NC}"