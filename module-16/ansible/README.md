# Ethereum Validator Ansible Automation

This directory contains Ansible playbooks for automating the deployment and management of Ethereum validators.

## Prerequisites

1. **Ansible installed** on your local machine:
   ```bash
   pip install ansible
   ```

2. **Server deployed** using Terraform (see ../terraform/README.md)

3. **SSH access** to the validator server

## Quick Start

Use the automated configuration script:

```bash
# From the ansible directory
./configure-validator.sh

# The script will automatically:
# - Detect your server IP from Terraform
# - Read fee recipient from inventory/hosts.yml
# - Generate secure Grafana password
# - Run all playbooks in correct order
```

## Initial Setup (Manual)

1. **Update inventory** with your server IP:
   ```bash
   # Get the IP from Terraform
   cd ../terraform
   VALIDATOR_IP=$(terraform output -raw server_ip)
   
   # Run playbook with the IP
   cd ../ansible
   ansible-playbook playbooks/setup-validator.yml -e "validator_ip=$VALIDATOR_IP"
   ```

2. **Set Grafana password**:
   ```bash
   # Create an encrypted variable
   ansible-vault create group_vars/all/vault.yml
   ```
   Add:
   ```yaml
   vault_grafana_admin_password: your-secure-password
   ```

## Configuration

### Important: Fee Recipient Format

**⚠️ CRITICAL**: Due to Ansible YAML limitations, the fee recipient address MUST be stored WITHOUT the 0x prefix in `inventory/hosts.yml`:

```yaml
# CORRECT (without 0x prefix):
validator_fee_recipient: "92145c8e548A87DFd716b1FD037a5e476a1f2a86"

# INCORRECT (will be converted to decimal):
validator_fee_recipient: "0x92145c8e548A87DFd716b1FD037a5e476a1f2a86"
```

The `0x` prefix is automatically added in the Docker Compose templates.

**Why this matters**: 
- If you include the 0x prefix, Ansible's YAML parser converts the hex value to decimal
- This results in errors like "Bytes20 should be 20 bytes, but was 24 bytes"
- Teku will fail to start without a valid fee recipient address

## Playbooks

### 1. Setup Validator (`setup-validator.yml`)
Complete initial setup of the validator node:
```bash
ansible-playbook playbooks/setup-validator.yml -e "validator_ip=<SERVER_IP>"
```

This playbook:
- Updates the system
- Installs Docker and dependencies
- Clones eth-docker
- Configures monitoring (Prometheus + Grafana)
- Applies security hardening

### 2. Validator Operations (`validator-operations.yml`)

#### Import Keys
```bash
# First, copy your keys to the server
scp -r validator_keys validator@<SERVER_IP>:~/ethereum/keys/

# Then import them
ansible-playbook playbooks/validator-operations.yml --tags import-keys
```

#### Start Services
```bash
ansible-playbook playbooks/validator-operations.yml --tags start
```

#### Check Status
```bash
ansible-playbook playbooks/validator-operations.yml --tags status
```

#### View Logs
```bash
ansible-playbook playbooks/validator-operations.yml --tags logs
```

#### Backup Validator
```bash
ansible-playbook playbooks/validator-operations.yml --tags backup
```

#### Update Software
```bash
ansible-playbook playbooks/validator-operations.yml --tags update
```

#### Voluntary Exit (⚠️ PERMANENT)
```bash
ansible-playbook playbooks/validator-operations.yml --tags voluntary-exit --ask-vault-pass
```

## Security Best Practices

1. **Use Ansible Vault** for sensitive data:
   ```bash
   ansible-vault encrypt_string 'mysecret' --name 'grafana_password'
   ```

2. **Restrict SSH access** by updating `ssh_allowed_ips` in inventory

3. **Regular backups**:
   ```bash
   # Automated daily backups are configured
   # Manual backup:
   ansible-playbook playbooks/validator-operations.yml --tags backup
   ```

4. **Monitor your validator**:
   - Grafana: http://localhost:3000 (via SSH tunnel)
   - Beaconcha.in: https://hoodi.beaconcha.in

## Monitoring Access

Create SSH tunnel for Grafana:
```bash
ssh -L 3000:localhost:3000 validator@<SERVER_IP>
```

Then access: http://localhost:3000
- Username: admin
- Password: (set in vault.yml)

## Directory Structure

```
ansible/
├── ansible.cfg           # Ansible configuration
├── inventory/
│   └── hosts.yml        # Inventory file
├── playbooks/
│   ├── setup-validator.yml      # Initial setup
│   ├── validator-operations.yml # Operations
│   ├── monitoring.yml          # Monitoring setup
│   ├── security.yml           # Security hardening
│   └── templates/
│       └── eth-docker.env.j2  # eth-docker config
└── group_vars/
    └── all/
        └── vault.yml    # Encrypted variables
```

## Troubleshooting

1. **Connection issues**:
   ```bash
   ansible all -m ping -e "validator_ip=<SERVER_IP>"
   ```

2. **Check playbook syntax**:
   ```bash
   ansible-playbook playbooks/setup-validator.yml --syntax-check
   ```

3. **Dry run**:
   ```bash
   ansible-playbook playbooks/setup-validator.yml --check
   ```

4. **Verbose output**:
   ```bash
   ansible-playbook playbooks/setup-validator.yml -vvv
   ```

### Common Issues

**Fee Recipient Decimal Conversion**
- **Symptom**: Fee recipient shows as long decimal number (e.g., 833966730207...)
- **Solution**: Remove 0x prefix from inventory/hosts.yml

**Grafana Dashboard Empty**
- **Symptom**: No data in Grafana dashboards
- **Cause**: Metrics ports not exposed
- **Solution**: Updated templates now expose ports 9545 (Nethermind) and 8008 (Teku)

**Teku Key Import Fails**
- **Symptom**: "Password file for keystore doesn't exist"
- **Solution**: Use updated import-validator-keys.sh script that creates password files

**Docker Volume Permissions**
- **Symptom**: "Read-only file system" errors
- **Solution**: Updated templates use :rw for validator-keys volume mount

## Next Steps

1. Generate validator keys (see ../scripts/generate-keys.sh)
2. Fund validator with 32 ETH from Hoodi faucet
3. Import keys and start validating
4. Monitor performance and attestations
5. Plan for voluntary exit before assignment deadline