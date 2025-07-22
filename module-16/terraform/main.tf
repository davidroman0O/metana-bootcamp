provider "hcloud" {
  token = var.hcloud_token
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  
  server_name = "${var.project_name}-${var.environment}"
}

# Generate SSH key pair if needed
resource "tls_private_key" "validator_ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "local_file" "private_key" {
  content         = tls_private_key.validator_ssh.private_key_pem
  filename        = "${path.module}/ssh_keys/${local.server_name}_rsa"
  file_permission = "0600"
}

resource "local_file" "public_key" {
  content  = tls_private_key.validator_ssh.public_key_openssh
  filename = "${path.module}/ssh_keys/${local.server_name}_rsa.pub"
}

# SSH Key
resource "hcloud_ssh_key" "validator" {
  name       = "${local.server_name}-key"
  public_key = file(var.ssh_public_key_path)
  labels     = local.common_tags
}

# Additional SSH key from generated pair
resource "hcloud_ssh_key" "validator_generated" {
  name       = "${local.server_name}-generated-key"
  public_key = tls_private_key.validator_ssh.public_key_openssh
  labels     = local.common_tags
}

# Create the validator server
module "validator_vps" {
  source = "./modules/vps"

  server_name     = local.server_name
  server_type     = var.server_type
  server_location = var.server_location
  ssh_keys        = [hcloud_ssh_key.validator.id, hcloud_ssh_key.validator_generated.id]
  labels          = local.common_tags
  user_data       = templatefile("${path.module}/cloud-init.yaml", {
    execution_client  = var.execution_client
    consensus_client  = var.consensus_client
    enable_monitoring = var.enable_monitoring
    ssh_public_key    = tls_private_key.validator_ssh.public_key_openssh
  })
}

# Create and attach additional storage volume
resource "hcloud_volume" "validator_data" {
  name     = "${local.server_name}-data"
  size     = var.additional_volume_size
  location = var.server_location
  labels   = local.common_tags
}

resource "hcloud_volume_attachment" "validator_data" {
  volume_id = hcloud_volume.validator_data.id
  server_id = module.validator_vps.server_id
  automount = true
}

# Configure firewall
module "validator_firewall" {
  source = "./modules/firewall"

  firewall_name   = "${local.server_name}-fw"
  server_id       = module.validator_vps.server_id
  allowed_ssh_ips = var.allowed_ssh_ips
  labels          = local.common_tags
}

# Output important information
output "server_ip" {
  description = "Public IP address of the validator server"
  value       = module.validator_vps.server_ip
}

output "server_id" {
  description = "ID of the validator server"
  value       = module.validator_vps.server_id
}

output "server_location" {
  description = "Location of the validator server"
  value       = var.server_location
}

output "server_type" {
  description = "Type of the validator server"
  value       = var.server_type
}

output "ssh_private_key_path" {
  description = "Path to the generated SSH private key"
  value       = abspath(local_file.private_key.filename)
}

output "ssh_connect_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i ${abspath(local_file.private_key.filename)} root@${module.validator_vps.server_ip}"
}