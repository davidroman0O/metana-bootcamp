variable "server_name" {
  description = "Name of the server"
  type        = string
}

variable "server_type" {
  description = "Hetzner server type"
  type        = string
}

variable "server_location" {
  description = "Server location"
  type        = string
}

variable "ssh_keys" {
  description = "List of SSH key IDs"
  type        = list(string)
}

variable "labels" {
  description = "Labels to apply to the server"
  type        = map(string)
  default     = {}
}

variable "user_data" {
  description = "Cloud-init user data"
  type        = string
  default     = ""
}