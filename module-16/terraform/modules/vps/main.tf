# Create the server
resource "hcloud_server" "validator" {
  name         = var.server_name
  server_type  = var.server_type
  location     = var.server_location
  image        = "ubuntu-22.04"
  ssh_keys     = var.ssh_keys
  labels       = var.labels
  user_data    = var.user_data
  
  # Ensure server is created before attempting to attach firewall
  lifecycle {
    create_before_destroy = true
  }
}