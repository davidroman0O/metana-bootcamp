#!/bin/bash
# Ethereum Validator Complete Cleanup Script
# This script removes all deployed resources and local files

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║           ETHEREUM VALIDATOR CLEANUP                 ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will destroy all resources!${NC}"
echo ""
echo "This script will:"
echo "• Destroy all Hetzner Cloud resources (server, volumes, firewall)"
echo "• Remove SSH keys and local state files"
echo "• Clean up generated configuration files"
echo ""
read -p "Are you sure you want to destroy everything? Type 'DESTROY' to confirm: " confirm

if [ "$confirm" != "DESTROY" ]; then
    echo -e "${GREEN}Cleanup cancelled.${NC}"
    exit 0
fi

# Change to terraform directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/terraform"

echo ""
echo -e "${YELLOW}Step 1: Destroying Terraform resources...${NC}"
if [ -f terraform.tfstate ] || [ -f .terraform/terraform.tfstate ]; then
    echo "Found Terraform state. Destroying resources..."
    
    # Initialize Terraform if needed
    if [ ! -d .terraform ] || [ ! -f .terraform.lock.hcl ]; then
        echo "Initializing Terraform..."
        terraform init -upgrade || {
            echo -e "${RED}ERROR: Failed to initialize Terraform!${NC}"
            exit 1
        }
    fi
    
    terraform destroy -auto-approve || {
        echo -e "${RED}ERROR: Failed to destroy resources!${NC}"
        echo "Please run 'terraform destroy' manually before cleaning up files."
        exit 1
    }
else
    echo -e "${YELLOW}No Terraform state found. Skipping resource destruction.${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Cleaning up local files...${NC}"

# ONLY remove files AFTER successful destroy
echo "• Removing Terraform cache..."
rm -rf .terraform/
rm -f .terraform.lock.hcl
rm -f tfplan
rm -f deployment-info-*.txt

# Check if state file has any resources
if [ -f terraform.tfstate ]; then
    # Check if state file contains any resources
    if terraform show -json 2>/dev/null | jq -e '.values.root_module.resources | length > 0' &>/dev/null; then
        echo -e "${RED}WARNING: State file still contains resources. Not removing.${NC}"
        echo -e "${RED}Run 'terraform destroy' again or use manual-cleanup.sh${NC}"
    else
        echo "• State file is empty (resources destroyed). Removing state files..."
        rm -f terraform.tfstate*
    fi
else
    echo "• Removing old state file backups..."
    rm -f terraform.tfstate*
fi

# Remove SSH keys
echo "• Removing SSH keys..."
rm -rf ssh_keys/

# Remove Ansible generated files
echo "• Removing Ansible files..."
cd ../ansible
rm -f validator-config-*.txt
rm -f *.retry
rm -f *.log

# Remove validator keys (sensitive material)
echo "• Removing validator keys..."
cd ../scripts
rm -rf validator_keys_*
rm -f grafana-password*.txt

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "To start fresh:"
echo "1. Ensure you have your Hetzner API token"
echo "2. Run: cd terraform && ./deploy.sh"
echo "3. Follow the deployment guide"
echo ""
echo -e "${YELLOW}Note: Your .env file and scripts are preserved.${NC}"