# Create firewall for the validator
resource "hcloud_firewall" "validator" {
  name   = var.firewall_name
  labels = var.labels
  
  # SSH access (restricted)
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = var.allowed_ssh_ips
    description = "SSH access"
  }
  
  # Ethereum P2P ports
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "30303"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Execution client P2P"
  }
  
  rule {
    direction   = "in"
    protocol    = "udp"
    port        = "30303"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Execution client P2P discovery"
  }
  
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "9000"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Consensus client P2P"
  }
  
  rule {
    direction   = "in"
    protocol    = "udp"
    port        = "9000"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Consensus client P2P discovery"
  }
  
  # Allow all outbound traffic
  rule {
    direction       = "out"
    protocol        = "tcp"
    port            = "any"
    destination_ips = ["0.0.0.0/0", "::/0"]
    description     = "Allow all outbound TCP"
  }
  
  rule {
    direction       = "out"
    protocol        = "udp"
    port            = "any"
    destination_ips = ["0.0.0.0/0", "::/0"]
    description     = "Allow all outbound UDP"
  }
  
  rule {
    direction       = "out"
    protocol        = "icmp"
    destination_ips = ["0.0.0.0/0", "::/0"]
    description     = "Allow ICMP outbound"
  }
}

# Attach firewall to server
resource "hcloud_firewall_attachment" "validator" {
  firewall_id = hcloud_firewall.validator.id
  server_ids  = [var.server_id]
}