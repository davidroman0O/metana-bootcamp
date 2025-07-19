#!/bin/bash
# Ethereum Validator Key Generation Script
# Run this on a secure, offline machine

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NETWORK="hoodi"
NUM_VALIDATORS=1

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create directories if they don't exist
mkdir -p "$PROJECT_ROOT/.bin"
mkdir -p "$PROJECT_ROOT/.keys"

# Set paths
KEY_DIR="$PROJECT_ROOT/.keys/validator_keys_$(date +%Y%m%d_%H%M%S)"

echo -e "${GREEN}Ethereum Validator Key Generation${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTICE:${NC}"
echo "1. Run this script on a SECURE, OFFLINE computer"
echo "2. Never share your mnemonic phrase with anyone"
echo "3. Store your mnemonic phrase in multiple secure locations"
echo "4. The withdrawal key controls your funds - keep it extra safe"
echo ""
read -p "Press Enter to continue..."

# Check if running on Linux/macOS
if [[ "$OSTYPE" != "linux-gnu"* ]] && [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}This script is designed for Linux/macOS${NC}"
    exit 1
fi

# Create working directory
mkdir -p "$KEY_DIR"
cd "$KEY_DIR"

# Download ethstaker deposit CLI (supports Hoodi testnet)
ETHSTAKER_VERSION="1.1.0"
ETHSTAKER_COMMIT="08f1e66"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux-amd64"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="darwin-amd64"
fi

DEPOSIT_CLI_URL="https://github.com/eth-educators/ethstaker-deposit-cli/releases/download/v${ETHSTAKER_VERSION}/ethstaker_deposit-cli-${ETHSTAKER_COMMIT}-${PLATFORM}.tar.gz"
DEPOSIT_CLI_DIR="ethstaker_deposit-cli-${ETHSTAKER_COMMIT}-${PLATFORM}"
DEPOSIT_CLI_PATH="$PROJECT_ROOT/.bin/${DEPOSIT_CLI_DIR}"

if [ ! -f "$DEPOSIT_CLI_PATH/deposit" ]; then
    echo -e "${GREEN}Downloading ethstaker deposit CLI v${ETHSTAKER_VERSION} (supports Hoodi)...${NC}"
    cd "$PROJECT_ROOT/.bin"
    wget -q "$DEPOSIT_CLI_URL" -O deposit-cli.tar.gz
    tar -xzf deposit-cli.tar.gz
    rm deposit-cli.tar.gz
    cd "$SCRIPT_DIR"
else
    echo -e "${GREEN}Using existing ethstaker deposit CLI${NC}"
fi

# Get number of validators
echo ""
read -p "How many validators do you want to create? (default: 1): " num_validators
NUM_VALIDATORS=${num_validators:-1}

# Get withdrawal address
echo ""
echo -e "${YELLOW}Withdrawal Address Setup:${NC}"
echo "You can either:"
echo "1. Generate a new withdrawal key (recommended for maximum security)"
echo "2. Use an existing Ethereum address (0x...)"
echo ""
read -p "Choose option (1 or 2): " withdrawal_option

WITHDRAWAL_ADDRESS=""
if [ "$withdrawal_option" == "2" ]; then
    read -p "Enter your withdrawal address (0x...): " WITHDRAWAL_ADDRESS
    # Basic validation
    if [[ ! "$WITHDRAWAL_ADDRESS" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
        echo -e "${RED}Invalid Ethereum address format${NC}"
        exit 1
    fi
fi

# Generate keys
echo ""
echo -e "${GREEN}Generating validator keys...${NC}"
echo -e "${YELLOW}You will be asked to create and confirm a password for your validator keys.${NC}"
echo -e "${YELLOW}You will then be shown a mnemonic phrase - WRITE IT DOWN SECURELY!${NC}"
echo ""

echo -e "${YELLOW}Starting interactive key generation process...${NC}"
echo -e "${YELLOW}The deposit CLI will prompt you for:${NC}"
echo "  1. Your mnemonic language (press Enter for English)"
echo "  2. A keystore password (create a strong one)"
echo "  3. To write down your 24-word mnemonic phrase"
echo ""

if [ -z "$WITHDRAWAL_ADDRESS" ]; then
    # Generate new mnemonic with withdrawal key
    "$DEPOSIT_CLI_PATH"/deposit new-mnemonic \
        --num_validators="$NUM_VALIDATORS" \
        --chain="$NETWORK" \
        --folder="$KEY_DIR"
else
    # Use existing withdrawal address (use execution_address for ethstaker CLI)
    "$DEPOSIT_CLI_PATH"/deposit new-mnemonic \
        --num_validators="$NUM_VALIDATORS" \
        --chain="$NETWORK" \
        --execution_address="$WITHDRAWAL_ADDRESS" \
        --folder="$KEY_DIR"
fi

# Create backup script in the key directory
cat > "$KEY_DIR/backup_keys.sh" << 'EOF'
#!/bin/bash
# Backup validator keys with encryption

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKUP_FILE="$SCRIPT_DIR/validator_backup_$(date +%Y%m%d_%H%M%S).tar.gz.enc"

echo "Creating encrypted backup..."
cd "$SCRIPT_DIR"
tar -czf - *.json | \
    openssl enc -aes-256-cbc -salt -pbkdf2 -out "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"
echo "Store this file and the encryption password in separate secure locations!"
EOF

chmod +x "$KEY_DIR/backup_keys.sh"

# Create key info file
cat > "$KEY_DIR/key_info.txt" << EOF
Validator Key Information
========================
Generated: $(date)
Network: $NETWORK
Number of Validators: $NUM_VALIDATORS
Key Directory: $KEY_DIR

Important Files:
- keystore-*.json: Your validator keystores
- deposit_data-*.json: Required for making the deposit

Security Checklist:
[ ] Mnemonic phrase written down and stored securely
[ ] Keystore password recorded securely
[ ] Keys backed up to multiple locations
[ ] Backup encryption password stored separately
[ ] Original computer will be securely wiped

Next Steps:
1. Run ./backup_keys.sh to create encrypted backup
2. Transfer keys to your validator server
3. Use deposit_data-*.json to make 32 ETH deposit per validator
4. Import keys on validator
EOF

# Display summary
echo ""
echo -e "${GREEN}✅ Key generation complete!${NC}"
echo ""
echo -e "${YELLOW}Generated files in:${NC}"
echo "$KEY_DIR"
echo ""
if [ -d "$KEY_DIR" ]; then
    echo "Contents:"
    ls -la "$KEY_DIR"
fi
echo ""
echo -e "${YELLOW}CRITICAL REMINDERS:${NC}"
echo "1. Your mnemonic phrase is the master key to your validators"
echo "2. Store it offline in multiple secure locations"
echo "3. Never enter it on an online computer"
echo "4. The keystore password is needed to run your validator"
echo "5. Create encrypted backups using the backup script"
echo ""
echo -e "${GREEN}Keys stored in: ${NC}$KEY_DIR"
echo -e "${GREEN}Deposit CLI in: ${NC}$DEPOSIT_CLI_PATH"
echo ""
echo "Next: Run transfer-validator-keys.sh to send keys to your server"