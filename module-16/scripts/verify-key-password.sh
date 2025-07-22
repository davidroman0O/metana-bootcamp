#!/bin/bash
# Script to verify validator key password

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Validator Key Password Verifier            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Local keys directory
LOCAL_KEYS_DIR="/Users/davidroman/Documents/code/github/metana-bootcamp/module-16/.keys/validator_keys_20250719_123531"

# Check if keys exist locally
if [ ! -d "$LOCAL_KEYS_DIR" ]; then
    echo -e "${RED}Error: Keys directory not found at:${NC}"
    echo "$LOCAL_KEYS_DIR"
    exit 1
fi

# Find keystore files
KEYSTORE_FILES=$(find "$LOCAL_KEYS_DIR" -name "keystore-*.json" 2>/dev/null)
if [ -z "$KEYSTORE_FILES" ]; then
    echo -e "${RED}Error: No keystore files found in $LOCAL_KEYS_DIR${NC}"
    exit 1
fi

# Get the first keystore file for testing
FIRST_KEYSTORE=$(echo "$KEYSTORE_FILES" | head -1)
echo -e "${YELLOW}Found keystore file:${NC}"
echo "$(basename "$FIRST_KEYSTORE")"
echo ""

# Ask for password
echo -e "${YELLOW}Enter your validator key password to verify:${NC}"
echo -n "Password: "
read -s PASSWORD
echo ""

# Skip ethdo and use Python method directly
echo -e "${BLUE}Setting up Python environment...${NC}"

# Create a temporary virtual environment
VENV_DIR=$(mktemp -d)
python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

# Install required package
pip install eth-keyfile >/dev/null 2>&1

echo -e "${BLUE}Verifying password...${NC}"
# Create a Python script to test decryption
python3 << EOF
import json
import sys

from eth_keyfile import decode_keyfile_json

# Read the keystore file
with open("$FIRST_KEYSTORE", 'r') as f:
    keystore = json.load(f)

# Try to decrypt with the password
try:
    private_key = decode_keyfile_json(keystore, "$PASSWORD".encode())
    print("\n✅ Password verified successfully!")
    print("The password is correct.")
    sys.exit(0)
except ValueError as e:
    print("\n❌ Password verification failed!")
    print("The password is incorrect.")
    sys.exit(1)
EOF

RESULT=$?

# Clean up virtual environment
deactivate
rm -rf "$VENV_DIR"

echo ""
if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}You can use this password when running:${NC}"
    echo "- transfer-validator-keys.sh"
    echo "- import-validator-keys.sh (on the server)"
else
    echo -e "${RED}Please ensure you're using the password you created when generating the keys.${NC}"
fi

exit $RESULT