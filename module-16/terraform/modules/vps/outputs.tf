output "server_id" {
  description = "ID of the created server"
  value       = hcloud_server.validator.id
}

output "server_ip" {
  description = "Public IP address of the server"
  value       = hcloud_server.validator.ipv4_address
}

output "server_status" {
  description = "Status of the server"
  value       = hcloud_server.validator.status
}

output "server_name" {
  description = "Name of the server"
  value       = hcloud_server.validator.name
}