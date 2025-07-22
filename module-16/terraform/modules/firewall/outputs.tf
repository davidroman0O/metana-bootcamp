output "firewall_id" {
  description = "ID of the created firewall"
  value       = hcloud_firewall.validator.id
}

output "firewall_name" {
  description = "Name of the firewall"
  value       = hcloud_firewall.validator.name
}