# Escopo exclusivo do site. O scaffold terraform/cloudflare do infra-k8s
# não tem state e descreve a frota antiga; não aplicar os dois diretórios.
terraform {
  required_version = ">= 1.9"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "cloudflare" {} # CLOUDFLARE_API_TOKEN somente no ambiente do processo

variable "zone_id" {
  type        = string
  description = "Zone ID descoberto pelo scripts/dns.py; não é credencial."
}

variable "ingress_ip" {
  type        = string
  default     = "163.176.29.184"
  description = "Entrada Traefik no flex1a; o workload roda no h6 via rede do cluster."
}

resource "cloudflare_record" "site" {
  for_each = {
    apex = "victorpersike.dev.br"
    www  = "www"
  }
  zone_id = var.zone_id
  name    = each.value
  type    = "A"
  content = var.ingress_ip
  ttl     = 120
  proxied = false

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [comment]
  }
}
