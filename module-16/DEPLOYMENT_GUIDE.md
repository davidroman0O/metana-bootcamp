# Complete Ethereum Validator Deployment Guide

This guide provides step-by-step instructions for deploying an Ethereum validator on the Hoodi testnet using our automated infrastructure solution.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Infrastructure Deployment](#phase-1-infrastructure-deployment)
3. [Phase 2: Server Configuration](#phase-2-server-configuration)
4. [Phase 3: Key Generation](#phase-3-key-generation)
5. [Phase 4: Obtaining Test ETH](#phase-4-obtaining-test-eth)
6. [Phase 5: Making the Deposit](#phase-5-making-the-deposit)
7. [Phase 6: Starting the Validator](#phase-6-starting-the-validator)
8. [Phase 7: Monitoring Operations](#phase-7-monitoring-operations)
9. [Phase 8: Voluntary Exit](#phase-8-voluntary-exit)
10. [Troubleshooting](#troubleshooting)
11. [Cleanup Procedures](#cleanup-procedures)

## Prerequisites

### Required Software

Ensure you have the following installed on your local machine:

```bash
# Check Terraform version (need >= 1.5.0)
terraform version

# Check Ansible version (need >= 2.9)
ansible --version

# Check Python version (need >= 3.x)
python3 --version

# Check if pip is installed
pip3 --version
```

### Install Missing Dependencies

**macOS:**
```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Terraform
brew install terraform

# Install Ansible
pip3 install ansible
```

**Linux:**
```bash
# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Install Ansible
pip3 install ansible
```

### Hetzner Cloud Setup

1. **Create Account**: Sign up at [https://www.hetzner.com/cloud](https://www.hetzner.com/cloud)

2. **Generate API Token**:
   - Log into Hetzner Cloud Console
   - Select your project (or create one)
   - Go to Security → API Tokens
   - Click "Generate API Token"
   - Give it a name (e.g., "eth-validator")
   - Select "Read & Write" permissions
   - Copy the token immediately (shown only once!)

3. **Verify Token**:
   ```bash
   # Token should be 64 characters
   echo -n "your-token-here" | wc -c
   # Should output: 64
   ```

## Phase 1: Infrastructure Deployment

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd metana-bootcamp/module-16
```

### Step 2: Set Environment Variables

```bash
# Set your Hetzner API token
export HETZNER_API_TOKEN="your-token-here"

# Verify it's set
echo $HETZNER_API_TOKEN | head -c 10
```

### Step 3: Deploy Infrastructure

The automated deployment script handles everything:

```bash
cd terraform
./deploy.sh
```

The script will:
1. Auto-detect your public IP for SSH access
2. Display deployment configuration and costs
3. Create all infrastructure resources
4. Generate SSH keys automatically
5. Save deployment information

**Expected output:**
```
╔══════════════════════════════════════════════════════╗
║        Ethereum Validator Infrastructure Deploy       ║
╚══════════════════════════════════════════════════════╝

🔍 Detecting your public IP...
   Your IP: XXX.XXX.XXX.XXX

📋 Deployment Configuration
═══════════════════════════════════════
Provider:        Hetzner Cloud
Server Type:     cpx41
Location:        Helsinki, Finland (hel1)
Additional Storage: 1TB
SSH Access From: XXX.XXX.XXX.XXX/32
Execution Client: Besu (minority client)
Consensus Client: Teku (minority client)
Monitoring:      Enabled (Prometheus + Grafana)
Network:         Hoodi Testnet
═══════════════════════════════════════

💰 Estimated Monthly Cost
═══════════════════════════════════════
Server (CPX41):  ~€64
Volume (1TB):    ~€48
Total:           ~€112/month (~$120)
═══════════════════════════════════════

Deploy validator infrastructure? (y/N): y
```

### Step 4: Alternative Deployment Options

If you prefer more control or encounter issues:

**Option 1: Manual Terraform with specific location**
```bash
# If you get resource availability errors, try different locations
./deploy.sh --location nbg1  # Nuremberg, Germany
./deploy.sh --location fsn1  # Falkenstein, Germany
./deploy.sh --location ash   # Ashburn, USA
```

**Option 2: Direct Terraform commands**
```bash
terraform init
terraform plan -var="hcloud_token=$HETZNER_API_TOKEN" \
               -var="allowed_ssh_ips=[\"$(curl -s ifconfig.me)/32\"]"
terraform apply -auto-approve
```

### Step 5: Save Deployment Information

After successful deployment:

```bash
# Get important outputs
VALIDATOR_IP=$(terraform output -raw server_ip)
SSH_KEY_PATH=$(terraform output -raw ssh_private_key_path)

# Test SSH connection
ssh -i $SSH_KEY_PATH root@$VALIDATOR_IP "echo 'Connection successful!'"
```

## Phase 2: Server Configuration

### Step 6: Configure Server with Ansible

The configuration script automates all server setup:

```bash
cd ../ansible
./configure-validator.sh
```

This process:
- Detects the server IP from Terraform
- Installs all required software
- Sets up eth-docker framework
- Configures monitoring stack
- Applies security hardening
- Takes approximately 20 minutes

**Save the Grafana password displayed!**

### Step 7: Manual Configuration (if needed)

If the automated script fails, you can run Ansible manually:

```bash
# Create inventory file
cat > inventory.ini << EOF
[validator]
$VALIDATOR_IP ansible_user=root ansible_ssh_private_key_file=$SSH_KEY_PATH

[validator:vars]
grafana_admin_password=YourSecurePasswordHere
EOF

# Run playbook
ansible-playbook -i inventory.ini playbooks/setup-validator.yml
```

## Phase 3: Key Generation

### Step 8: Generate Validator Keys

⚠️ **CRITICAL SECURITY**: Perform this on a secure, OFFLINE computer!

**On a secure offline machine:**

```bash
# Navigate to scripts directory
cd scripts

# Run the key generation script
./generate-keys.sh
```

The script will:
1. Create `.bin` and `.keys` directories in the project root if they don't exist
2. Download the ethstaker-deposit-cli to `.bin` (which supports Hoodi testnet)
3. Ask for the number of validators (start with 1)
4. Give you withdrawal address options:
   - Option 1: Generate new (recommended)
   - Option 2: Use existing address

Then the interactive CLI will:
1. Ask for your mnemonic language (press Enter for English)
2. Prompt you to create a keystore password (remember this!)
3. Generate and display your 24-word mnemonic phrase
4. **WRITE DOWN YOUR 24-WORD MNEMONIC PHRASE - THIS IS CRITICAL!**
5. Ask you to type the mnemonic back to confirm
6. Create validator keys in `.keys/validator_keys_[timestamp]` directory

**Security checklist:**
- [ ] Mnemonic phrase written on paper (never digital)
- [ ] Stored in multiple secure locations
- [ ] Keystore password recorded securely
- [ ] No photos or digital copies of mnemonic

### Step 9: Create Encrypted Backup

Still on the offline machine:

```bash
cd validator_keys_[timestamp]
./backup_keys.sh
# Enter encryption password when prompted
```

### Step 10: Transfer Keys to Server

**Option 1: Via USB to online machine, then SCP**
```bash
# From online machine with keys
scp -i $SSH_KEY_PATH -r validator_keys_* validator@$VALIDATOR_IP:~/
```

**Option 2: Direct from offline machine (if temporarily connected)**
```bash
scp -i path/to/ssh/key -r validator_keys_* validator@$VALIDATOR_IP:~/
```

## Phase 4: Obtaining Test ETH

### Step 11: Get Hoodi Testnet ETH

You need 32 ETH per validator for the deposit.

**⚠️ IMPORTANT: How Deposits Work**
- You DON'T need to receive ETH to your validator
- You need 32 ETH in YOUR wallet (MetaMask or any wallet you control)
- You'll SEND this ETH to the deposit contract via the launchpad
- Your validator is identified by its public key, not an ETH address

**Get your validator information for reference:**
```bash
# On your local machine where you generated keys
cd .keys/validator_keys_*

# View your validator public key (for monitoring)
cat deposit_data-*.json | jq -r '.[0].pubkey'

# View your withdrawal credentials
cat deposit_data-*.json | jq -r '.[0].withdrawal_credentials'
```

**Small amounts (0.1-1 ETH) from faucets:**

1. **Primary Hoodi Faucets**:
   - [Hoodi Faucet](https://hoodifaucet.org) - 0.1 ETH every 24 hours
   - [EthStaker Hoodi Faucet](https://faucet.hoodi.ethstaker.cc) - For small amounts

2. **Alternative Sources**:
   - [QuickNode Hoodi Faucet](https://faucet.quicknode.com/ethereum/hoodi)
   - [Chainstack Hoodi Support](https://chainstack.com/hoodi-testnet)

**For 32 ETH (full validator amount):**

1. Join the [EthStaker Discord](https://discord.gg/ethstaker)
2. Go to #hoodi-testnet channel
3. Explain you're running a validator for educational purposes
4. Request 32 ETH with your address

### Step 12: Verify Balance

Check your balance on the block explorer:
```
https://hoodi.etherscan.io/address/YOUR_ADDRESS
```

## Phase 5: Making the Deposit

### Step 13: Access Hoodi Launchpad

1. Visit the official Hoodi Launchpad:
   - **Standard Process**: [https://hoodi-launchpad.ethereum.org](https://hoodi-launchpad.ethereum.org)
   - **EthStaker Process**: [https://hoodi.launchpad.ethstaker.cc](https://hoodi.launchpad.ethstaker.cc)

2. Connect MetaMask

3. Add Hoodi network if prompted:
   ```
   Network Name: Hoodi Testnet
   RPC URL: https://rpc.hoodi.ethpandaops.io
   Chain ID: 17071
   Currency Symbol: ETH
   Block Explorer: https://hoodi.etherscan.io
   ```

### Step 14: Upload Deposit Data

1. Click "Become a Validator"
2. Read through all warnings
3. Click "Upload deposit data"
4. Navigate to your keys directory and select `deposit_data-[timestamp].json`:
   ```bash
   # File location on your local machine:
   module-16/.keys/validator_keys_[timestamp]/deposit_data-[timestamp].json
   ```
5. Verify the displayed information:
   - Amount shows 32 ETH
   - Your validator public key is displayed
   - Withdrawal credentials are correct
   - Network shows Hoodi

### Step 15: Complete Deposit

**What happens during deposit:**
- You send 32 ETH FROM your MetaMask TO the deposit contract
- The contract uses your deposit data to register your validator
- Your validator is identified by its public key (not an ETH address)

1. Ensure you have 32 ETH in your connected MetaMask wallet
2. Review all information carefully
3. Click "Submit Deposit"
4. MetaMask will show:
   - To: Hoodi Deposit Contract (0x00000000219ab540356cBB839Cbe05303d7705Fa)
   - Amount: 32 ETH
5. Confirm the transaction
6. Save the transaction hash
7. Wait for confirmation

### Step 16: Monitor Activation

Your validator will be activated after ~16 hours. Monitor status:
- [https://hoodi.beaconcha.in](https://hoodi.beaconcha.in)
- Search for your validator public key
- Status progression: Deposited → Pending → Active

## Phase 6: Starting the Validator

### Step 17: Import Validator Keys

SSH to your server and import keys:

```bash
# Connect to server
ssh -i $SSH_KEY_PATH validator@$VALIDATOR_IP

# Copy keys to eth-docker
cd ethereum/eth-docker
sudo cp -r ~/validator_keys_*/validator_keys/* ./validator-keys/
sudo chown -R 1000:1000 ./validator-keys/
sudo chmod 600 ./validator-keys/keystore*

# Import keys into Teku
docker-compose exec consensus teku validator-client --validator-keys=/validator-keys:/validator-keys
```

### Step 18: Monitor Sync Progress

Check that your node is syncing:

```bash
# Check execution client sync
docker-compose logs -f execution | grep -i "sync"

# Check consensus client sync
docker-compose logs -f consensus | grep -i "sync"
```

Wait for messages indicating sync completion:
- Execution: "Sync finished"
- Consensus: "Fully synced"

### Step 19: Verify Validator Status

After importing keys (but before deposit):

```bash
# Check that Teku loaded your validator keys
docker-compose logs consensus | grep -i "validator\|key"

# Look for messages like:
# "Loaded validator" 
# "public_key=0x..."
```

Once synced and activated (after deposit and ~16 hour wait):

```bash
# Check for attestations
docker-compose logs consensus | grep -i "attestation"

# Should see messages like:
# "Published attestation"
# "Attestation produced"
# "Validator duties received"
```

To get your validator public key for monitoring:
```bash
# On your local machine
cd scripts
cat validator_keys_*/deposit_data-*.json | jq -r '.[0].pubkey'
```

## Phase 7: Monitoring Operations

### Step 20: Access Grafana Dashboards

Create SSH tunnel for secure access:

```bash
# From your local machine
ssh -i $SSH_KEY_PATH -L 3000:localhost:3000 validator@$VALIDATOR_IP
```

Open browser: [http://localhost:3000](http://localhost:3000)
- Username: `admin`
- Password: (from Ansible setup)

### Step 21: Key Metrics to Monitor

**Grafana Dashboards:**
- **Besu Overview**: Peer count (>25), sync status, block height
- **Teku Overview**: Attestation effectiveness (>95%), validator balance
- **Node Exporter**: CPU (<80%), Memory (<80%), Disk usage (<80%)

**External Monitoring:**
1. Add validator to [beaconcha.in](https://hoodi.beaconcha.in)
2. Enable email/mobile alerts
3. Monitor attestation performance

### Step 22: Daily Operations

**Check validator health:**
```bash
# Quick health check
ssh -i $SSH_KEY_PATH validator@$VALIDATOR_IP "cd ethereum/eth-docker && docker-compose ps"

# View recent logs
ssh -i $SSH_KEY_PATH validator@$VALIDATOR_IP "cd ethereum/eth-docker && docker-compose logs --tail=100 consensus"
```

## Phase 8: Voluntary Exit

### Step 23: Prepare for Exit

Before exiting:
- [ ] Confirm validator has been active for required period
- [ ] Document rewards earned
- [ ] Ensure you have backups of all keys
- [ ] Understand this is PERMANENT

### Step 24: Perform Voluntary Exit

```bash
cd scripts
./voluntary-exit.sh
```

The script will:
1. Display warnings about permanence
2. Show your validators
3. Ask for confirmation multiple times
4. Execute the exit command
5. Save exit confirmation

### Step 25: Monitor Exit Process

- Check explorer for exit status
- Exit typically processes in 1-2 days
- Validator stops earning immediately
- Full withdrawal available after exit completes

## Troubleshooting

### Common Issues and Solutions

**1. SSH Connection Refused**
```bash
# Remove old host key
ssh-keygen -R $VALIDATOR_IP

# Wait 2-3 minutes after deployment
# Verify your IP hasn't changed
curl -4 ifconfig.me
```

**2. Terraform Resource Unavailable**
```bash
# Try different location
terraform destroy -auto-approve
./deploy.sh --location nbg1
```

**3. Slow Sync**
```bash
# Enable checkpoint sync
docker-compose exec consensus sh -c 'echo "CHECKPOINT_SYNC_URL=https://checkpoint-sync.hoodi.ethpandaops.io" >> /config/.env'
docker-compose restart consensus
```

**4. High Disk Usage**
```bash
# Check disk usage
df -h

# Clean Docker artifacts
docker system prune -a

# If critical, prune old chain data
docker-compose stop
sudo rm -rf /mnt/HC_Volume_validator_data/execution/chaindata
docker-compose start
```

**5. Validator Not Attesting**
- Verify node is fully synced
- Check validator keys are imported
- Ensure activation is complete on beaconcha.in
- Verify system time is accurate

## Cleanup Procedures

### Complete Cleanup

To remove all resources and start fresh:

```bash
# From project root
./cleanup.sh
# Type 'DESTROY' to confirm
```

### Manual Cleanup (if state lost)

```bash
# Install hcloud CLI
brew install hcloud

# Configure
hcloud context create my-project
# Enter your API token

# Run manual cleanup
./manual-cleanup.sh
```

### Selective Cleanup

```bash
# Just destroy infrastructure (keep keys)
cd terraform
terraform destroy -auto-approve

# Just remove validator keys (keep infrastructure)
rm -rf scripts/validator_keys_*
```

## Important Reminders

1. **Security**:
   - Never share your mnemonic phrase
   - Keep validator keys backed up securely
   - Monitor for security updates

2. **Operations**:
   - Check validator daily
   - Keep node software updated
   - Monitor disk space

3. **Exit Planning**:
   - Plan exit timing carefully
   - Understand tax implications
   - Keep records of all operations

---

**Support**: For issues, check the repository issues or seek help in the EthStaker Discord #hoodi-testnet channel.