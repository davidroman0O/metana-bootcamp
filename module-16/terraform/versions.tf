terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}