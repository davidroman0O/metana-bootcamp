# Ethereum Validator Infrastructure with Terraform

This Terraform configuration deploys a secure Ethereum validator node on Hetzner Cloud for the Hoodi testnet.

## Architecture

- **VPS**: Hetzner CPX41 (8 vCPU, 16GB RAM, 240GB SSD)
- **Additional Storage**: 1TB volume for blockchain data
- **OS**: Ubuntu 22.04 LTS
- **Security**: Firewall rules, fail2ban, automatic updates
- **Monitoring**: Prometheus + Grafana (optional)

## Prerequisites

1. [Terraform](https://www.terraform.io/downloads) >= 1.5.0
2. [Hetzner Cloud Account](https://www.hetzner.com/cloud)
3. Hetzner Cloud API Token

## Quick Start

### Option 1: Using the Deployment Script (Recommended)

The easiest way to deploy is using the included deployment script:

```bash
# Set your API token as environment variable
export HETZNER_API_TOKEN=your-token-here

# Run the deployment script
./deploy.sh
```

The script will:
- Auto-detect your public IP address
- Show deployment configuration and costs
- Initialize and apply Terraform
- Save deployment information

### Option 2: Using Environment Variables

```bash
# Set required variables
export TF_VAR_hcloud_token="your-token-here"
export TF_VAR_allowed_ssh_ips='["your.ip.here/32"]'

# Deploy
terraform init
terraform plan
terraform apply
```

### Option 3: Using terraform.tfvars (Less Secure)

1. **Copy and configure variables**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Deploy**:
   ```bash
   terraform init
   terraform apply
   ```

### Connect to Your Server

After deployment:
```bash
# Get connection details
terraform output ssh_connect_command

# Or manually
ssh -i ssh_keys/eth-validator-hoodi-testnet_rsa root@<server_ip>
```

## Post-Deployment Steps

1. **Switch to validator user**:
   ```bash
   sudo su - validator
   ```

2. **Complete eth-docker setup**:
   ```bash
   cd eth-docker
   ./ethd config
   ./ethd install
   ```

3. **Generate validator keys** (on a secure offline machine):
   ```bash
   # Download staking deposit CLI
   wget https://github.com/ethereum/staking-deposit-cli/releases/download/v2.7.0/staking_deposit-cli-<version>-linux-amd64.tar.gz
   # Generate keys for Hoodi testnet
   ./deposit new-mnemonic --chain=hoodi
   ```

4. **Import keys and start services**:
   ```bash
   ./ethd keys import
   ./ethd start
   ```

## Monitoring

If monitoring is enabled, access Grafana:
```bash
ssh -L 3000:localhost:3000 validator@<server_ip>
# Open http://localhost:3000 in your browser
```

## Security Considerations

- SSH is restricted to specified IPs only
- Automatic security updates are enabled
- Firewall allows only required ports
- fail2ban protects against brute force attacks
- Keys should be generated offline and imported securely

## Cost

- Hetzner CPX41: ~€64/month
- Additional 1TB storage: ~€48/month
- Total: ~€112/month (~$120/month)

## Cleanup

To destroy all resources:
```bash
terraform destroy
```

⚠️ **Warning**: This will permanently delete your server and all data!

## Troubleshooting

1. **Check cloud-init logs**:
   ```bash
   sudo journalctl -u cloud-final
   ```

2. **Check disk space**:
   ```bash
   df -h
   ```

3. **View validator logs**:
   ```bash
   cd ~/eth-docker
   ./ethd logs -f consensus
   ```

## Alternative: Contabo Deployment

To use Contabo instead of Hetzner, you'll need to:
1. Replace the Hetzner provider with Contabo provider
2. Update server specifications to match Contabo's offerings
3. Adjust the cloud-init script for Contabo's environment

Contabo Terraform provider: `contabo/contabo`