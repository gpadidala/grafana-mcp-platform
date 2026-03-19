# ─────────────────────────────────────────────────────────────────
# DEV — AKS cluster
# ─────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.8"
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"     # TODO
    storage_account_name = "tfstategrafanamcp"       # TODO
    container_name       = "tfstate"
    key                  = "grafana-mcp/dev/terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

module "aks_dev" {
  source = "../../modules/aks"

  cluster_name        = "dev-aks"
  resource_group_name = "grafana-mcp-dev-rg"
  location            = var.location
  environment         = "dev"
  node_vm_size        = "Standard_D2s_v3"
  node_min            = 1
  node_max            = 4

  tags = {
    Environment = "dev"
    ManagedBy   = "terraform"
    Project     = "grafana-mcp-platform"
  }
}

variable "subscription_id" {
  type = string
  # TODO: set via TF_VAR_subscription_id env var
}

variable "location" {
  type    = string
  default = "eastus"
}

output "cluster_name" {
  value = module.aks_dev.cluster_name
}

output "key_vault_url" {
  value = module.aks_dev.key_vault_url
}

output "kubeconfig_command" {
  value = module.aks_dev.kubeconfig_command
}
