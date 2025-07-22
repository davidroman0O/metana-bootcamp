variable "firewall_name" {
  description = "Name of the firewall"
  type        = string
}

variable "server_id" {
  description = "ID of the server to attach firewall to"
  type        = string
}

variable "allowed_ssh_ips" {
  description = "List of IP addresses allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "labels" {
  description = "Labels to apply to the firewall"
  type        = map(string)
  default     = {}
}