# Module 16: Ethereum Validator Solo Staking on Hoodi Testnet

A complete Infrastructure as Code (IaC) solution for deploying an Ethereum validator node with automated setup, security hardening, and monitoring. This project demonstrates solo staking on the Hoodi testnet using best practices and production-ready patterns.

## 🎯 Project Overview

This repository contains a fully automated deployment solution for running an Ethereum validator node, created as part of the Module 16 assignment. The implementation uses Terraform for infrastructure provisioning, Ansible for configuration management, and Docker for running Ethereum clients.

### Key Features

- **One-Command Deployment**: Automated infrastructure setup with intelligent defaults
- **Security-First Design**: Automated OS hardening, firewall configuration, and secure key management
- **Production-Ready Architecture**: Same patterns can be used for mainnet deployment
- **Complete Monitoring**: Integrated Prometheus and Grafana with pre-configured dashboards
- **Multi-Client Support**: Supports both Besu and Nethermind execution clients with Teku consensus
- **Cost-Optimized**: Deployable on Hetzner Cloud (~$120/month)

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Terraform     │────▶│  Hetzner Cloud   │────▶│     Docker      │
│ Infrastructure  │     │   Ubuntu 22.04   │     │   Containers    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌──────────────┐           ┌──────────────┐
                        │   Ansible    │           │  eth-docker  │
                        │Configuration │           │  Framework   │
                        └──────────────┘           └──────────────┘
```

### Technology Stack

- **Infrastructure**: Terraform v1.5+ with Hetzner Cloud provider
- **Configuration**: Ansible 2.9+ with idempotent playbooks
- **Container Runtime**: Docker & Docker Compose
- **Ethereum Stack**: eth-docker framework
- **Execution Client**: Nethermind (recommended for Hoodi) or Besu
- **Consensus Client**: Teku (minority client)
- **Monitoring**: Prometheus + Grafana + Node Exporter
- **Operating System**: Ubuntu 22.04 LTS

### Server Specifications

- **Provider**: Hetzner Cloud
- **Instance Type**: CPX41 (8 vCPU, 16GB RAM, 240GB SSD)
- **Additional Storage**: 1TB volume for blockchain data
- **Network**: Hoodi testnet (active 2025)
- **Location**: Helsinki, Finland (hel1)

## 🚀 Quick Start

### Prerequisites

1. **Local Machine Requirements**:
   - Terraform >= 1.5.0
   - Ansible >= 2.9
   - Python 3.x with pip
   - Git
   - SSH client

2. **Accounts Required**:
   - [Hetzner Cloud account](https://www.hetzner.com/cloud)
   - Hetzner API token
   - MetaMask wallet for testnet ETH

3. **Important Information Needed**:
   - **Fee Recipient Address** (MANDATORY as of 2025) - Your Ethereum address for block rewards
     - ⚠️ **CRITICAL**: Due to Ansible YAML limitations, store WITHOUT the 0x prefix
     - Example: `92145c8e548A87DFd716b1FD037a5e476a1f2a86` (not `0x92145c8e...`)

### Deployment Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd metana-bootcamp/module-16

# 2. Set your Hetzner API token
export HETZNER_API_TOKEN=your-token-here

# 3. Deploy infrastructure (5 minutes)
cd terraform
./deploy.sh

# 4. Configure server with Ansible (20 minutes)
cd ../ansible
# First, update inventory/hosts.yml with your fee recipient address
# Then run:
./configure-validator.sh

# 5. Generate validator keys (OFFLINE - separate secure machine)
cd ../scripts
./generate-keys.sh
# This uses ethstaker-deposit-cli which supports Hoodi testnet

# 6. Transfer keys to server
./transfer-validator-keys.sh

# 6. Copy keys to server and start validating
# See DEPLOYMENT_GUIDE.md for detailed steps
```

## 📁 Project Structure

```
module-16/
├── terraform/                 # Infrastructure as Code
│   ├── main.tf               # Main Terraform configuration
│   ├── variables.tf          # Variable definitions
│   ├── cloud-init.yaml       # Server initialization
│   ├── deploy.sh             # Automated deployment script
│   └── modules/              # Reusable Terraform modules
│       ├── vps/              # VPS provisioning module
│       └── firewall/         # Security configuration
├── ansible/                  # Configuration Management
│   ├── configure-validator.sh # Main configuration script
│   ├── playbooks/            # Ansible playbooks
│   │   ├── setup-validator.yml        # Initial setup
│   │   ├── eth-docker-setup.yml       # Docker configuration
│   │   ├── monitoring.yml             # Grafana/Prometheus
│   │   ├── security.yml               # Security hardening
│   │   └── templates/                 # Configuration templates
│   └── README.md             # Ansible documentation
├── scripts/                  # Utility Scripts
│   ├── generate-keys.sh      # Secure key generation
│   └── voluntary-exit.sh     # Safe validator exit
├── cleanup.sh                # Complete resource cleanup
├── manual-cleanup.sh         # Manual cleanup (if Terraform state lost)
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## 🔐 Security Features

- **Network Security**: 
  - Firewall rules restrict access to required ports only
  - SSH access limited to specified IPs
  - fail2ban protection against brute force attacks

- **System Hardening**:
  - Automated OS security updates
  - Docker daemon security configuration
  - Non-root user for validator operations
  - Secure sysctl optimizations

- **Key Management**:
  - Offline key generation process
  - Encrypted key storage
  - Secure key import procedures
  - Slashing protection database

## 📊 Monitoring & Dashboards

The deployment includes a complete monitoring stack:

- **Grafana Dashboards**:
  - Besu execution client metrics
  - Teku consensus client health
  - Validator performance and attestations
  - System resource utilization

- **Access Monitoring**:
  ```bash
  # Create SSH tunnel
  ssh -i terraform/ssh_keys/eth-validator-hoodi-testnet_rsa \
      -L 3000:localhost:3000 validator@<server-ip>
  
  # Open in browser
  http://localhost:3000
  # Login: admin / <password-from-setup>
  ```

## 💰 Cost Analysis

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| Hetzner CPX41 | ~€64 | 8 vCPU, 16GB RAM |
| 1TB Volume | ~€48 | Blockchain storage |
| **Total** | **~€112** (~$120) | All inclusive |

## 🛠️ Common Operations

### Check Sync Status
```bash
ssh -i <key-path> validator@<server-ip>
cd ethereum/eth-docker
docker-compose logs -f consensus
```

### Monitor Validator Performance
Access Grafana dashboards or check [beaconcha.in](https://hoodi.beaconcha.in)

### Perform Voluntary Exit
```bash
cd scripts
./voluntary-exit.sh
# Follow safety prompts carefully - this is PERMANENT
```

### Update Clients
```bash
ssh -i <key-path> validator@<server-ip>
cd ethereum/eth-docker
docker-compose pull
docker-compose up -d
```

## 🧹 Cleanup

To completely remove all resources:
```bash
# Automated cleanup (recommended)
./cleanup.sh

# Manual cleanup if Terraform state is lost
./manual-cleanup.sh
```

## 📚 Documentation

- [**DEPLOYMENT_GUIDE.md**](DEPLOYMENT_GUIDE.md) - Step-by-step deployment instructions
- [**terraform/README.md**](terraform/README.md) - Infrastructure details
- [**ansible/README.md**](ansible/README.md) - Configuration management guide

## 🚨 Important Notes

1. **Testnet Only**: This deployment is configured for Hoodi testnet. Adjustments needed for mainnet.
2. **Key Security**: Never share your mnemonic phrase or validator keys
3. **Monitoring**: Regularly check your validator performance to ensure proper attestations
4. **Voluntary Exit**: The exit process is permanent and cannot be reversed
5. **Fee Recipient Format**: Due to Ansible YAML limitations, store WITHOUT 0x prefix in inventory
6. **Teku Password Files**: Teku requires a `.txt` password file for each keystore

## 🔧 Common Issues and Fixes

### Fee Recipient Decimal Conversion
**Problem**: Ansible converts hex addresses to decimal numbers
**Solution**: Store fee recipient WITHOUT `0x` prefix in `inventory/hosts.yml`
```yaml
# CORRECT:
validator_fee_recipient: "92145c8e548A87DFd716b1FD037a5e476a1f2a86"
# WRONG:
validator_fee_recipient: "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86"
```

### Grafana Dashboards Empty
**Problem**: Metrics ports not exposed in Docker configuration
**Solution**: Fixed in templates - ports 9545 (Nethermind) and 8008 (Teku) now exposed

### Teku Validator Key Import Fails
**Problem**: Teku requires password files with `.txt` extension
**Solution**: Updated `import-validator-keys.sh` script creates password files automatically

### Verify Key Password
**Tool**: Use `scripts/verify-key-password.sh` to test your password before import
```bash
cd scripts
./verify-key-password.sh
```

## 🤝 Acknowledgments

- Ethereum Foundation for Hoodi testnet resources
- [eth-docker](https://github.com/eth-educators/eth-docker) team for the excellent framework
- [EthStaker](https://ethstaker.cc) community for best practices and guidance

---

Validator transaction https://hoodi.beaconcha.in/validator/0x8c3b2f4aad4907b055db99dde21bcd68282a3a93100cb6e4ce0dd0cbd81dc2e84d422dfd3058a98ff56304f2b74ff7c8#deposits

Voluntary exit https://hoodi.beaconcha.in/slot/917252#voluntary-exits