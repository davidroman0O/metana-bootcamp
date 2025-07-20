#!/bin/bash
# Grafana Monitoring Access Script
# This script automatically sets up SSH tunnel to access Grafana dashboards

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
echo -e "${BLUE}║          Grafana Monitoring Access Script            ║${NC}"
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

# Extract values from Terraform
VALIDATOR_IP=$(terraform output -raw server_ip 2>/dev/null || echo "")
SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path 2>/dev/null || echo "")

# Get Grafana password from Terraform state
GRAFANA_PASSWORD=$(terraform output -raw grafana_admin_password 2>/dev/null || echo "")

cd - > /dev/null

# Verify we got the values
if [ -z "$VALIDATOR_IP" ] || [ -z "$SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: Could not get connection details from Terraform${NC}"
    echo "Please check your Terraform deployment"
    exit 1
fi

echo -e "${GREEN}Connection Details:${NC}"
echo "  Server IP: $VALIDATOR_IP"
echo "  SSH Key: $SSH_KEY_PATH"
if [ -n "$GRAFANA_PASSWORD" ]; then
    echo "  Grafana Password: $GRAFANA_PASSWORD"
else
    echo "  Grafana Password: (not found - check Ansible output)"
fi
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY_PATH${NC}"
    exit 1
fi

# Check if tunnel already exists
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}Port 3000 is already in use${NC}"
    echo "Existing process using port 3000:"
    lsof -ti:3000 | xargs ps -p
    echo ""
    read -p "Kill existing process and continue? (y/N): " kill_existing
    if [[ "$kill_existing" =~ ^[Yy]$ ]]; then
        lsof -ti:3000 | xargs kill -9
        sleep 2
        echo -e "${GREEN}Killed existing process${NC}"
    else
        echo "Exiting..."
        exit 1
    fi
fi

# Create SSH tunnel
echo -e "${BLUE}Creating SSH tunnel to Grafana...${NC}"
echo "Establishing connection to $VALIDATOR_IP:3000..."

# Start SSH tunnel in background
ssh -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    -o ExitOnForwardFailure=yes \
    -N -L 3000:localhost:3000 \
    -i "$SSH_KEY_PATH" \
    validator@"$VALIDATOR_IP" &

SSH_PID=$!

# Wait a moment for tunnel to establish
sleep 3

# Check if tunnel is running
if ! ps -p $SSH_PID > /dev/null; then
    echo -e "${RED}Failed to establish SSH tunnel${NC}"
    exit 1
fi

check_status "SSH tunnel established (PID: $SSH_PID)"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Closing SSH tunnel...${NC}"
    kill $SSH_PID 2>/dev/null || true
    echo -e "${GREEN}Tunnel closed${NC}"
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Display access information
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✅ GRAFANA ACCESS READY!                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access Grafana at:${NC} http://localhost:3000"
echo ""
echo -e "${BLUE}Login Credentials:${NC}"
echo "  Username: admin"
if [ -n "$GRAFANA_PASSWORD" ]; then
    echo "  Password: $GRAFANA_PASSWORD"
else
    echo "  Password: (check your Ansible output or use 'admin')"
fi
echo ""
# Detect execution client from server
EXECUTION_CLIENT=$(ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" validator@"$VALIDATOR_IP" "cd ethereum/eth-docker && grep EL_NODE .env | cut -d= -f2" 2>/dev/null || echo "unknown")

echo -e "${BLUE}Available Dashboards:${NC}"
echo "  - Node Exporter (System Metrics)"
if [ "$EXECUTION_CLIENT" = "nethermind" ]; then
    echo "  - Nethermind Dashboard (Execution Client)"
else
    echo "  - Besu Dashboard (Execution Client)"
fi
echo "  - Teku Dashboard (Consensus Client)"
echo "  - Validator Performance"
echo ""
echo -e "${YELLOW}Press Ctrl+C to close the tunnel when done${NC}"
echo ""

# Open browser if available
if command -v open > /dev/null 2>&1; then
    # macOS
    echo -e "${BLUE}Opening Grafana in your browser...${NC}"
    open "http://localhost:3000"
elif command -v xdg-open > /dev/null 2>&1; then
    # Linux
    echo -e "${BLUE}Opening Grafana in your browser...${NC}"
    xdg-open "http://localhost:3000"
else
    echo -e "${YELLOW}Please open http://localhost:3000 in your browser${NC}"
fi

# Keep script running
echo ""
echo -e "${GREEN}Tunnel is active. Monitoring connection...${NC}"
wait $SSH_PID