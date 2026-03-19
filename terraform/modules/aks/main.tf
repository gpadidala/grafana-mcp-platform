# ─────────────────────────────────────────────────────────────────
# Terraform Module: AKS Cluster for Grafana MCP Platform
# ─────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.8"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
  }
}

variable "cluster_name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type    = string
  default = "eastus"
}

variable "kubernetes_version" {
  type    = string
  default = "1.30"
}

variable "environment" {
  type = string
}

variable "node_vm_size" {
  type    = string
  default = "Standard_D2s_v3"
}

variable "node_min" {
  type    = number
  default = 1
}

variable "node_max" {
  type    = number
  default = 6
}

variable "tags" {
  type    = map(string)
  default = {}
}

# ── Resource Group ────────────────────────────────────────────────
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# ── AKS Cluster ───────────────────────────────────────────────────
resource "azurerm_kubernetes_cluster" "aks" {
  name                = var.cluster_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "system"
    node_count          = 1
    vm_size             = "Standard_D2s_v3"
    enable_auto_scaling = false
    os_disk_size_gb     = 50
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
    load_balancer_sku = "standard"
  }

  # Enable Workload Identity for ESO
  workload_identity_enabled = true
  oidc_issuer_enabled       = true

  # Pod Security Standards
  azure_policy_enabled = true

  tags = var.tags
}

# ── MCP Dedicated Node Pool ───────────────────────────────────────
resource "azurerm_kubernetes_cluster_node_pool" "mcp" {
  name                  = "mcp"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = var.node_vm_size
  enable_auto_scaling   = true
  min_count             = var.node_min
  max_count             = var.node_max
  os_disk_size_gb       = 50

  node_labels = {
    dedicated = "mcp"
    env       = var.environment
  }

  node_taints = ["dedicated=mcp:NoSchedule"]

  tags = var.tags
}

# ── Key Vault for secrets ─────────────────────────────────────────
resource "azurerm_key_vault" "kv" {
  name                = "grafana-mcp-${var.environment}-kv"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # Soft delete and purge protection for prod
  soft_delete_retention_days = var.environment == "prod" ? 90 : 7
  purge_protection_enabled   = var.environment == "prod"

  tags = var.tags
}

data "azurerm_client_config" "current" {}

# ── Outputs ──────────────────────────────────────────────────────
output "cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}

output "kube_config" {
  value     = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive = true
}

output "key_vault_url" {
  value = azurerm_key_vault.kv.vault_uri
}

output "oidc_issuer_url" {
  value = azurerm_kubernetes_cluster.aks.oidc_issuer_url
}

output "kubeconfig_command" {
  value = "az aks get-credentials --resource-group ${var.resource_group_name} --name ${var.cluster_name}"
}
