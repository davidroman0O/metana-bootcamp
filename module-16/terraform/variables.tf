variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string
  default     = "eth-validator"
}

variable "environment" {
  description = "Environment name (e.g., testnet, mainnet)"
  type        = string
  default     = "hoodi-testnet"
}

variable "server_type" {
  description = "Hetzner server type"
  type        = string
  default     = "cpx41"
}

variable "server_location" {
  description = "Hetzner datacenter location"
  type        = string
  default     = "hel1"  # Helsinki, Finland
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "allowed_ssh_ips" {
  description = "List of IP addresses allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Change this to your IP for security
}

variable "execution_client" {
  description = "Ethereum execution client to use"
  type        = string
  default     = "besu"
  
  validation {
    condition     = contains(["besu", "nethermind", "erigon"], var.execution_client)
    error_message = "Execution client must be besu, nethermind, or erigon"
  }
}

variable "consensus_client" {
  description = "Ethereum consensus client to use"
  type        = string
  default     = "teku"
  
  validation {
    condition     = contains(["teku", "nimbus", "lighthouse", "lodestar"], var.consensus_client)
    error_message = "Consensus client must be teku, nimbus, lighthouse, or lodestar"
  }
}

variable "enable_monitoring" {
  description = "Enable Prometheus and Grafana monitoring"
  type        = bool
  default     = true
}

variable "additional_volume_size" {
  description = "Size of additional storage volume in GB"
  type        = number
  default     = 1000
}