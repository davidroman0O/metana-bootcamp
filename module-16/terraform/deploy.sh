#!/bin/bash
# Ethereum Validator Deployment Script
# Usage: ./deploy.sh [HETZNER_TOKEN]
# Or set HETZNER_API_TOKEN environment variable

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Banner
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Ethereum Validator Infrastructure Deploy      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to show usage
show_usage() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --token TOKEN       Hetzner API token (or set HETZNER_API_TOKEN env var)"
    echo "  -l, --location LOCATION Server location (fsn1, nbg1, hel1, ash)"
    echo "  -s, --server-type TYPE  Server type (cpx11, cpx21, cpx31, cpx41, cpx51)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh --token YOUR_TOKEN --location hel1"
    echo "  ./deploy.sh -l ash -s cpx31"
    echo "  export HETZNER_API_TOKEN=your_token && ./deploy.sh -l nbg1"
    echo ""
    echo "Available locations:"
    echo "  fsn1 - Falkenstein, Germany"
    echo "  nbg1 - Nuremberg, Germany"
    echo "  hel1 - Helsinki, Finland"
    echo "  ash  - Ashburn, USA"
    exit 1
}

# Parse command line arguments
HETZNER_TOKEN=""
LOCATION=""
SERVER_TYPE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--token)
            HETZNER_TOKEN="$2"
            shift 2
            ;;
        -l|--location)
            LOCATION="$2"
            shift 2
            ;;
        -s|--server-type)
            SERVER_TYPE="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            # Legacy support: first unnamed argument is token
            if [ -z "$HETZNER_TOKEN" ]; then
                HETZNER_TOKEN="$1"
            fi
            shift
            ;;
    esac
done

# Get token from environment if not provided
HETZNER_TOKEN="${HETZNER_TOKEN:-${HETZNER_API_TOKEN:-${TF_VAR_hcloud_token}}}"

if [ -z "$HETZNER_TOKEN" ]; then
    echo -e "${RED}Error: Hetzner API token required${NC}"
    echo ""
    show_usage
fi

# Set defaults if not provided
LOCATION="${LOCATION:-${TF_VAR_server_location:-hel1}}"
SERVER_TYPE="${SERVER_TYPE:-${TF_VAR_server_type:-cpx41}}"

# Map location codes to names
case "$LOCATION" in
    fsn1) LOCATION_NAME="Falkenstein, Germany" ;;
    nbg1) LOCATION_NAME="Nuremberg, Germany" ;;
    hel1) LOCATION_NAME="Helsinki, Finland" ;;
    ash)  LOCATION_NAME="Ashburn, USA" ;;
    *) LOCATION_NAME="$LOCATION" ;;
esac

# Auto-detect public IP
echo -e "${GREEN}🔍 Detecting your public IP...${NC}"
MY_IP=$(curl -s -4 ifconfig.me)
if [ -z "$MY_IP" ]; then
    echo -e "${RED}Failed to detect public IP${NC}"
    read -p "Enter your public IP manually: " MY_IP
fi
echo -e "   Your IP: ${YELLOW}${MY_IP}${NC}"

# Display deployment configuration
echo ""
echo -e "${GREEN}📋 Deployment Configuration${NC}"
echo "═══════════════════════════════════════"
echo -e "Provider:        ${YELLOW}Hetzner Cloud${NC}"
echo -e "Server Type:     ${YELLOW}${SERVER_TYPE}${NC}"
echo -e "Location:        ${YELLOW}${LOCATION_NAME}${NC} (${LOCATION})"
echo -e "Additional Storage: ${YELLOW}1TB${NC}"
echo -e "SSH Access From: ${YELLOW}${MY_IP}/32${NC}"
echo -e "Execution Client: ${YELLOW}Besu${NC} (minority client)"
echo -e "Consensus Client: ${YELLOW}Teku${NC} (minority client)"
echo -e "Monitoring:      ${YELLOW}Enabled${NC} (Prometheus + Grafana)"
echo -e "Network:         ${YELLOW}Hoodi Testnet${NC}"
echo "═══════════════════════════════════════"
echo ""

# Cost estimate
echo -e "${GREEN}💰 Estimated Monthly Cost${NC}"
echo "═══════════════════════════════════════"
echo -e "Server (CPX41):  ${YELLOW}~€64${NC}"
echo -e "Volume (1TB):    ${YELLOW}~€48${NC}"
echo -e "Total:           ${YELLOW}~€112/month (~$120)${NC}"
echo "═══════════════════════════════════════"
echo ""

# Confirmation
read -p "$(echo -e ${YELLOW})Deploy validator infrastructure? (y/N): $(echo -e ${NC})" confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 0
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform is not installed${NC}"
    echo "Please install Terraform first: https://www.terraform.io/downloads"
    exit 1
fi

# Deploy with Terraform
echo ""
echo -e "${GREEN}🚀 Starting Terraform deployment...${NC}"
echo ""

# Initialize Terraform
echo -e "${BLUE}→ Initializing Terraform...${NC}"
if ! terraform init; then
    echo -e "${RED}Terraform initialization failed${NC}"
    exit 1
fi

# Create SSH keys directory if it doesn't exist
mkdir -p ssh_keys

# Plan deployment
echo ""
echo -e "${BLUE}→ Planning infrastructure...${NC}"
terraform plan \
    -var="hcloud_token=${HETZNER_TOKEN}" \
    -var="allowed_ssh_ips=[\"${MY_IP}/32\"]" \
    -var="server_location=${LOCATION}" \
    -var="server_type=${SERVER_TYPE}" \
    -out=tfplan

echo ""
read -p "$(echo -e ${YELLOW})Review the plan above. Continue with deployment? (y/N): $(echo -e ${NC})" confirm_plan
if [[ ! "$confirm_plan" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    rm -f tfplan
    exit 0
fi

# Apply infrastructure
echo ""
echo -e "${BLUE}→ Creating infrastructure...${NC}"
if ! terraform apply tfplan; then
    echo -e "${RED}Deployment failed${NC}"
    rm -f tfplan
    exit 1
fi

rm -f tfplan

# Get outputs
VALIDATOR_IP=$(terraform output -raw server_ip)
SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path)
SERVER_LOCATION=$(terraform output -raw server_location)
SERVER_TYPE_DEPLOYED=$(terraform output -raw server_type)

# Clean up old SSH host key to prevent conflicts
echo ""
echo -e "${BLUE}→ Cleaning up old SSH host keys...${NC}"
ssh-keygen -R "$VALIDATOR_IP" 2>/dev/null || true

# Success message
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ DEPLOYMENT SUCCESSFUL!                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 Infrastructure Details${NC}"
echo "═══════════════════════════════════════"
echo -e "Validator IP:    ${YELLOW}${VALIDATOR_IP}${NC}"
echo -e "Server Type:     ${YELLOW}${SERVER_TYPE_DEPLOYED}${NC}"
echo -e "Location:        ${YELLOW}${SERVER_LOCATION}${NC}"
echo -e "SSH Key:         ${YELLOW}${SSH_KEY_PATH}${NC}"
echo ""
echo -e "${GREEN}🔗 SSH Commands${NC}"
echo "═══════════════════════════════════════"
echo -e "Root access:     ${YELLOW}ssh -i ${SSH_KEY_PATH} root@${VALIDATOR_IP}${NC}"
echo -e "Validator user:  ${YELLOW}ssh -i ${SSH_KEY_PATH} validator@${VALIDATOR_IP}${NC} (after Ansible)"
echo ""
echo -e "${GREEN}📝 Next Steps${NC}"
echo "═══════════════════════════════════════"
echo "1. Wait 2-3 minutes for server initialization"
echo "2. Configure the server with Ansible:"
echo -e "   ${YELLOW}cd ../ansible${NC}"
echo -e "   ${YELLOW}./configure-validator.sh ${VALIDATOR_IP}${NC}"
echo ""
echo "3. Generate validator keys (on a secure offline machine):"
echo -e "   ${YELLOW}cd ../scripts${NC}"
echo -e "   ${YELLOW}./generate-keys.sh${NC}"
echo ""
echo -e "${GREEN}📚 Documentation${NC}"
echo "═══════════════════════════════════════"
echo -e "Full deployment guide: ${YELLOW}../../docs/deployment-guide.md${NC}"
echo ""

# Save deployment info
DEPLOYMENT_INFO="deployment-info-$(date +%Y%m%d-%H%M%S).txt"
cat > "$DEPLOYMENT_INFO" << EOF
Ethereum Validator Deployment Information
========================================
Date: $(date)
Validator IP: ${VALIDATOR_IP}
SSH Key Path: ${SSH_KEY_PATH}
SSH Access From: ${MY_IP}/32
Server Type: ${SERVER_TYPE_DEPLOYED}
Location: ${SERVER_LOCATION}
Network: Hoodi Testnet

SSH Commands:
- Root: ssh -i ${SSH_KEY_PATH} root@${VALIDATOR_IP}
- Validator: ssh -i ${SSH_KEY_PATH} validator@${VALIDATOR_IP}

Next: Run Ansible configuration
EOF

echo -e "${BLUE}Deployment information saved to: ${YELLOW}${DEPLOYMENT_INFO}${NC}"