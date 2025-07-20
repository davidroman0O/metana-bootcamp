#!/bin/bash
# Ethereum Validator Configuration Script
# Usage: ./configure-validator.sh VALIDATOR_IP

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Non-interactive mode support - DEFAULT IS AUTO!
AUTO_CONFIRM="${AUTO_CONFIRM:-true}"
DEFAULT_EXECUTION_CLIENT="${EXECUTION_CLIENT:-nethermind}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-}"
FEE_RECIPIENT="${FEE_RECIPIENT:-}"

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Banner
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Ethereum Validator Configuration            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Get current machine's public IP
echo -e "${GREEN}🔍 Detecting your public IP...${NC}"
MY_IP=$(curl -s -4 ifconfig.me)
echo -e "   Your IP: ${YELLOW}${MY_IP}${NC}"

# Get validator IP from parameter or Terraform output
VALIDATOR_IP="${1}"
SSH_KEY_PATH=""

if [ -z "$VALIDATOR_IP" ]; then
    echo -e "${GREEN}🔍 Getting validator details from Terraform...${NC}"
    
    # Try to get IP and SSH key path from Terraform output
    if [ -d "../terraform" ]; then
        cd ../terraform
        VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null)
        SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null)
        cd - > /dev/null
    fi
    
    if [ -z "$VALIDATOR_IP" ]; then
        echo -e "${RED}Error: Could not determine validator IP${NC}"
        echo ""
        echo "Either:"
        echo "1. Run from the ansible directory after terraform deployment"
        echo "2. Or provide IP manually: ./configure-validator.sh VALIDATOR_IP"
        exit 1
    fi
    
    echo -e "   Found IP: ${YELLOW}${VALIDATOR_IP}${NC}"
else
    # If IP was provided, try to get SSH key path from Terraform
    if [ -d "../terraform" ]; then
        cd ../terraform
        SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null)
        cd - > /dev/null
    fi
fi

# Convert relative SSH key path to absolute
if [ -n "$SSH_KEY_PATH" ]; then
    # If path is relative (starts with ./ or doesn't start with /), make it absolute
    if [[ "$SSH_KEY_PATH" == ./* ]] || [[ "$SSH_KEY_PATH" != /* ]]; then
        # Remove leading ./ if present
        SSH_KEY_PATH="${SSH_KEY_PATH#./}"
        # Make it absolute from terraform directory
        SSH_KEY_PATH="../terraform/$SSH_KEY_PATH"
    fi
else
    # Default SSH key path if not found from Terraform
    SSH_KEY_PATH="../terraform/ssh_keys/eth-validator-hoodi-testnet_rsa"
fi

# Verify SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: SSH key not found at: $SSH_KEY_PATH${NC}"
    echo "Looking for SSH key in terraform directory..."
    
    # Try to find it
    FOUND_KEY=$(find ../terraform -name "*_rsa" -type f 2>/dev/null | head -1)
    if [ -n "$FOUND_KEY" ]; then
        SSH_KEY_PATH="$FOUND_KEY"
        echo -e "${GREEN}Found SSH key at: $SSH_KEY_PATH${NC}"
    else
        echo -e "${RED}No SSH key found in terraform directory${NC}"
        exit 1
    fi
fi

# Check if Ansible is installed
if ! command -v ansible &> /dev/null; then
    echo -e "${RED}Error: Ansible is not installed${NC}"
    echo "Please install Ansible first:"
    echo "  pip install ansible"
    exit 1
fi

# Generate secure Grafana password
echo -e "${GREEN}🔐 Generating secure passwords...${NC}"
if [ -z "$GRAFANA_PASSWORD" ]; then
    GRAFANA_PASS=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
else
    GRAFANA_PASS="$GRAFANA_PASSWORD"
    echo -e "${YELLOW}Using provided Grafana password${NC}"
fi

# Execution client selection - DEFAULT IS NETHERMIND!
if [ -z "$EXECUTION_CLIENT" ]; then
    EXECUTION_CLIENT="$DEFAULT_EXECUTION_CLIENT"
    echo -e "${GREEN}Using default execution client: ${YELLOW}${EXECUTION_CLIENT}${NC}"
else
    echo -e "${GREEN}Using provided execution client: ${YELLOW}${EXECUTION_CLIENT}${NC}"
fi

# Fee recipient address for validator rewards - MANDATORY!
if [ -z "$FEE_RECIPIENT" ]; then
    # Try to read from inventory/hosts.yml
    # Handle both quoted and unquoted values
    # NOTE: Fee recipient in inventory MUST NOT include 0x prefix (Ansible limitation)
    INVENTORY_FEE_RECIPIENT=$(grep "validator_fee_recipient:" inventory/hosts.yml | grep -v "#" | sed 's/.*validator_fee_recipient: *//' | tr -d '"' | tr -d ' ')
    
    if [ -n "$INVENTORY_FEE_RECIPIENT" ] && [ "$INVENTORY_FEE_RECIPIENT" != "0000000000000000000000000000000000000000" ]; then
        FEE_RECIPIENT="$INVENTORY_FEE_RECIPIENT"
        echo -e "${GREEN}Using fee recipient from inventory/hosts.yml: ${YELLOW}${FEE_RECIPIENT}${NC}"
    else
        echo ""
        echo -e "${RED}⚠️  IMPORTANT: Fee recipient address is REQUIRED!${NC}"
        echo -e "${YELLOW}This is where your validator block rewards will be sent.${NC}"
        echo ""
        
        # Interactive mode: prompt for fee recipient
        if [[ "$AUTO_CONFIRM" != "true" ]]; then
            echo "Enter your Ethereum address for receiving block rewards:"
            echo "Example: 742d35Cc6634C0532925a3b844Bc9e7595f8fA66 (without 0x prefix)"
            read -p "Fee recipient address: " FEE_RECIPIENT
        else
            # Auto mode: no valid fee recipient found
            echo -e "${RED}ERROR: No valid fee recipient found!${NC}"
            echo ""
            echo "Please set your fee recipient address using one of these methods:"
            echo "1. Update inventory/hosts.yml with your address (recommended)"
            echo "2. Environment variable: FEE_RECIPIENT=YourAddress ./configure-validator.sh"
            echo "3. Interactive mode: AUTO_CONFIRM=false ./configure-validator.sh"
            echo ""
            echo "Current value in inventory/hosts.yml: ${INVENTORY_FEE_RECIPIENT:-not found}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}Using provided fee recipient: ${YELLOW}${FEE_RECIPIENT}${NC}"
fi

# Validate fee recipient format (without 0x prefix due to Ansible limitation)
if [[ ! "$FEE_RECIPIENT" =~ ^[a-fA-F0-9]{40}$ ]]; then
    echo -e "${RED}ERROR: Invalid Ethereum address format!${NC}"
    echo "Received: '$FEE_RECIPIENT' (length: ${#FEE_RECIPIENT})"
    echo "Address must be 40 hex characters (without 0x prefix)"
    echo "Example: 92145c8e548A87DFd716b1FD037a5e476a1f2a86"
    echo ""
    echo "NOTE: Due to Ansible YAML limitations, the address MUST be stored"
    echo "without the 0x prefix in inventory/hosts.yml"
    exit 1
fi

# Warn if using burn address (without 0x)
if [ "$FEE_RECIPIENT" == "0000000000000000000000000000000000000000" ]; then
    echo -e "${RED}WARNING: Using burn address (all zeros) as fee recipient!${NC}"
    echo "This will BURN all your block proposal rewards!"
    if [[ "$AUTO_CONFIRM" != "true" ]]; then
        read -p "Are you SURE you want to continue? (yes/no): " confirm_burn
        if [ "$confirm_burn" != "yes" ]; then
            echo "Configuration cancelled."
            exit 1
        fi
    else
        echo -e "${RED}Cannot use burn address in auto mode. Exiting.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Using fee recipient: ${YELLOW}0x${FEE_RECIPIENT}${NC}"

# Display configuration
echo ""
echo -e "${GREEN}📋 Configuration Details${NC}"
echo "═══════════════════════════════════════"
echo -e "Validator IP:     ${YELLOW}${VALIDATOR_IP}${NC}"
echo -e "Execution Client: ${YELLOW}${EXECUTION_CLIENT}${NC}"
echo -e "Fee Recipient:    ${YELLOW}0x${FEE_RECIPIENT}${NC}"
echo -e "Grafana User:     ${YELLOW}admin${NC}"
echo -e "Grafana Password: ${YELLOW}${GRAFANA_PASS}${NC}"
echo "═══════════════════════════════════════"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Save the Grafana password above!${NC}"
echo ""

# Clean up old SSH host key to prevent conflicts
echo -e "${GREEN}🔧 Cleaning up old SSH host keys...${NC}"
ssh-keygen -R "$VALIDATOR_IP" 2>/dev/null || true

# Test connectivity
echo -e "${GREEN}🔍 Testing connectivity to ${VALIDATOR_IP}...${NC}"
if ! ansible all -i "${VALIDATOR_IP}," -m ping -e "ansible_user=root ansible_ssh_private_key_file=${SSH_KEY_PATH}" -e "ansible_ssh_common_args='-o StrictHostKeyChecking=no'" &> /dev/null; then
    echo -e "${YELLOW}⏳ Server might still be initializing. Waiting 30 seconds...${NC}"
    sleep 30
    
    if ! ansible all -i "${VALIDATOR_IP}," -m ping -e "ansible_user=root ansible_ssh_private_key_file=${SSH_KEY_PATH}" -e "ansible_ssh_common_args='-o StrictHostKeyChecking=no'" &> /dev/null; then
        echo -e "${RED}Cannot connect to server. Please check:${NC}"
        echo "1. Server is fully initialized (wait 2-3 minutes after Terraform)"
        echo "2. SSH key exists at: ${SSH_KEY_PATH}"
        echo "3. Your IP is allowed in firewall rules"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Connection successful${NC}"


# Confirmation - AUTO MODE IS DEFAULT!
if [[ "$AUTO_CONFIRM" == "true" ]]; then
    echo ""
    echo -e "${GREEN}🚀 Auto-mode enabled (default), proceeding with configuration...${NC}"
    echo -e "${YELLOW}To run interactively, use: AUTO_CONFIRM=false $0${NC}"
else
    echo ""
    read -p "$(echo -e ${YELLOW})Configure validator server with ${EXECUTION_CLIENT}? This will take ~20 minutes. (y/N): $(echo -e ${NC})" confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${RED}Configuration cancelled.${NC}"
        exit 0
    fi
fi

# Run Ansible playbook
echo ""
echo -e "${GREEN}🚀 Starting Ansible configuration...${NC}"
echo ""

# Create a temporary inventory file
TEMP_INVENTORY=$(mktemp)
cat > "$TEMP_INVENTORY" << EOF
[all]
validator ansible_host=${VALIDATOR_IP} ansible_user=root ansible_ssh_private_key_file=${SSH_KEY_PATH} ansible_python_interpreter=/usr/bin/python3 ansible_ssh_common_args='-o StrictHostKeyChecking=no'

[all:vars]
validator_ip=${VALIDATOR_IP}
vault_grafana_admin_password=${GRAFANA_PASS}
grafana_admin_password=${GRAFANA_PASS}

# Ethereum configuration
execution_client=${EXECUTION_CLIENT}
consensus_client=teku
network=hoodi

# Paths
ethereum_base_dir=/home/validator/ethereum
data_volume_path=/mnt/HC_Volume_validator_data

# Monitoring
enable_monitoring=true

# Security
enable_firewall=true
ssh_allowed_ips=["${MY_IP}/32"]

# Additional variables
ansible_user_uid=1000
ansible_user_gid=1000
validator_graffiti="Hoodi Validator"
checkpoint_sync_url="https://checkpoint-sync.hoodi.ethpandaops.io"
validator_fee_recipient=${FEE_RECIPIENT}
EOF

# Run the playbook with progress
if ! ANSIBLE_FORCE_COLOR=true ansible-playbook \
    -i "$TEMP_INVENTORY" \
    playbooks/setup-validator.yml \
    -e "validator_ip=${VALIDATOR_IP}" \
    -e "vault_grafana_admin_password=${GRAFANA_PASS}"; then
    echo -e "${RED}Configuration failed${NC}"
    rm -f "$TEMP_INVENTORY"
    exit 1
fi

# Cleanup
rm -f "$TEMP_INVENTORY"

# Success message
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ CONFIGURATION COMPLETE!                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 Access Information${NC}"
echo "═══════════════════════════════════════"
echo -e "SSH Command:      ${YELLOW}ssh -i ${SSH_KEY_PATH} validator@${VALIDATOR_IP}${NC}"
echo -e "Grafana URL:      ${YELLOW}http://localhost:3000${NC} (via SSH tunnel)"
echo -e "Grafana User:     ${YELLOW}admin${NC}"
echo -e "Grafana Password: ${YELLOW}${GRAFANA_PASS}${NC}"
echo ""
echo -e "${GREEN}🔗 Create SSH Tunnel for Grafana${NC}"
echo "═══════════════════════════════════════"
echo -e "${YELLOW}ssh -i ${SSH_KEY_PATH} -L 3000:localhost:3000 validator@${VALIDATOR_IP}${NC}"
echo "Then open: http://localhost:3000"
echo ""
echo -e "${GREEN}📝 Next Steps${NC}"
echo "═══════════════════════════════════════"
echo "1. SSH to the server:"
echo -e "   ${YELLOW}ssh -i ${SSH_KEY_PATH} validator@${VALIDATOR_IP}${NC}"
echo ""
echo "2. Check eth-docker services:"
echo -e "   ${YELLOW}cd ethereum/eth-docker${NC}"
echo -e "   ${YELLOW}docker-compose ps${NC}"
echo ""
echo "3. Monitor sync progress:"
echo -e "   ${YELLOW}docker-compose logs -f consensus${NC}"
echo ""
echo "4. Generate validator keys (on secure offline machine):"
echo -e "   ${YELLOW}cd ../scripts && ./generate-keys.sh${NC}"
echo ""
echo -e "${GREEN}📚 Documentation${NC}"
echo "═══════════════════════════════════════"
echo -e "Full guide: ${YELLOW}../docs/deployment-guide.md${NC}"
echo ""

# Save configuration info
CONFIG_INFO="validator-config-$(date +%Y%m%d-%H%M%S).txt"
cat > "$CONFIG_INFO" << EOF
Validator Configuration Information
==================================
Date: $(date)
Validator IP: ${VALIDATOR_IP}
Execution Client: ${EXECUTION_CLIENT}
Fee Recipient: ${FEE_RECIPIENT}
Grafana Password: ${GRAFANA_PASS}

SSH Access:
- ssh -i ${SSH_KEY_PATH} validator@${VALIDATOR_IP}

Grafana Access:
1. Create tunnel: ssh -i ${SSH_KEY_PATH} -L 3000:localhost:3000 validator@${VALIDATOR_IP}
2. Open browser: http://localhost:3000
3. Login: admin / ${GRAFANA_PASS}

Next Steps:
1. Monitor blockchain sync progress
2. Generate validator keys offline
3. Get 32 ETH from testnet faucets
4. Import keys and start validating
EOF

echo -e "${BLUE}Configuration saved to: ${YELLOW}${CONFIG_INFO}${NC}"
echo -e "${RED}⚠️  Keep this file secure - it contains passwords!${NC}"