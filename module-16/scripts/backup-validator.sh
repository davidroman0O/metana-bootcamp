#!/bin/bash
# Validator Backup Script
# Creates encrypted backups of validator keys and configuration

set -e

# Configuration
BACKUP_DIR="/home/validator/backups"
RETENTION_DAYS=30
ETHEREUM_DIR="/home/validator/ethereum"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/validator_backup_$TIMESTAMP"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Validator Backup Script                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Creating backup at $BACKUP_PATH...${NC}"
mkdir -p "$BACKUP_PATH"

# Backup validator keys
if [ -d "$ETHEREUM_DIR/validator_keys" ]; then
    echo -e "${YELLOW}Backing up validator keys...${NC}"
    cp -r "$ETHEREUM_DIR/validator_keys" "$BACKUP_PATH/"
else
    echo -e "${YELLOW}No validator keys found to backup${NC}"
fi

# Backup eth-docker configuration
if [ -d "$ETHEREUM_DIR/eth-docker" ]; then
    echo -e "${YELLOW}Backing up eth-docker configuration...${NC}"
    cp -r "$ETHEREUM_DIR/eth-docker/.env" "$BACKUP_PATH/" 2>/dev/null || true
    cp -r "$ETHEREUM_DIR/eth-docker/docker-compose.yml" "$BACKUP_PATH/" 2>/dev/null || true
    cp -r "$ETHEREUM_DIR/eth-docker/custom" "$BACKUP_PATH/" 2>/dev/null || true
fi

# Backup JWT secret
if [ -f "$ETHEREUM_DIR/jwt/jwt.hex" ]; then
    echo -e "${YELLOW}Backing up JWT secret...${NC}"
    mkdir -p "$BACKUP_PATH/jwt"
    cp "$ETHEREUM_DIR/jwt/jwt.hex" "$BACKUP_PATH/jwt/"
fi

# Create manifest file
echo -e "${YELLOW}Creating backup manifest...${NC}"
cat > "$BACKUP_PATH/manifest.txt" << EOF
Validator Backup Manifest
========================
Date: $(date)
Hostname: $(hostname)
Backup Path: $BACKUP_PATH

Contents:
EOF

# List backed up files
find "$BACKUP_PATH" -type f -printf '%P\n' | sort >> "$BACKUP_PATH/manifest.txt"

# Compress
echo -e "${YELLOW}Compressing backup...${NC}"
tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "validator_backup_$TIMESTAMP"
rm -rf "$BACKUP_PATH"

# Encrypt (optional)
if [ ! -z "$BACKUP_PASSWORD" ]; then
    echo -e "${YELLOW}Encrypting backup...${NC}"
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "$BACKUP_PATH.tar.gz" \
        -out "$BACKUP_PATH.tar.gz.enc" -pass pass:"$BACKUP_PASSWORD"
    rm "$BACKUP_PATH.tar.gz"
    FINAL_BACKUP="$BACKUP_PATH.tar.gz.enc"
    echo -e "${GREEN}✅ Backup encrypted: $FINAL_BACKUP${NC}"
else
    FINAL_BACKUP="$BACKUP_PATH.tar.gz"
    echo -e "${GREEN}✅ Backup created: $FINAL_BACKUP${NC}"
    echo -e "${RED}⚠️  WARNING: Backup is NOT encrypted!${NC}"
    echo -e "${YELLOW}To encrypt, run with: BACKUP_PASSWORD='your-password' $0${NC}"
fi

# Show backup size
BACKUP_SIZE=$(du -h "$FINAL_BACKUP" | cut -f1)
echo -e "${GREEN}Backup size: ${YELLOW}$BACKUP_SIZE${NC}"

# Cleanup old backups
echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "validator_backup_*.tar.gz*" -mtime +$RETENTION_DAYS -delete

# List current backups
echo ""
echo -e "${GREEN}Current backups:${NC}"
ls -lh "$BACKUP_DIR"/validator_backup_*.tar.gz* 2>/dev/null || echo "No backups found"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║             ✅ BACKUP COMPLETE!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}To restore from this backup:${NC}"
echo -e "${YELLOW}1. Copy backup to target server${NC}"
echo -e "${YELLOW}2. Decrypt (if encrypted): openssl enc -aes-256-cbc -d -pbkdf2 -in $FINAL_BACKUP -out backup.tar.gz${NC}"
echo -e "${YELLOW}3. Extract: tar -xzf backup.tar.gz${NC}"
echo -e "${YELLOW}4. Copy files to appropriate locations${NC}"
echo ""

# Create cron job suggestion
echo -e "${BLUE}To schedule automatic backups, add to crontab:${NC}"
echo -e "${YELLOW}0 3 * * * BACKUP_PASSWORD='your-secure-password' $0${NC}"
echo ""