# ─────────────────────────────────────────────────────────────────
# Terraform Module: GKE Cluster for Grafana MCP Platform
# ─────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.8"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "kubernetes_version" {
  type    = string
  default = "1.30"
}

variable "environment" {
  type = string
}

variable "node_machine_type" {
  type    = string
  default = "n2-standard-2"
}

variable "node_min" {
  type    = number
  default = 1
}

variable "node_max" {
  type    = number
  default = 6
}

# ── GKE Cluster ───────────────────────────────────────────────────
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id

  # Remove default node pool — use separately managed
  remove_default_node_pool = true
  initial_node_count       = 1

  min_master_version = var.kubernetes_version

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Network policy
  network_policy {
    enabled = true
  }

  # Pod Security Policy → use PodSecurity admission
  pod_security_policy_config {
    enabled = false
  }

  # Binary Authorization for supply chain security
  binary_authorization {
    evaluation_mode = var.environment == "prod" ? "PROJECT_SINGLETON_POLICY_ENFORCE" : "DISABLED"
  }
}

# ── System node pool ──────────────────────────────────────────────
resource "google_container_node_pool" "system" {
  name     = "system"
  cluster  = google_container_cluster.primary.name
  location = var.region
  project  = var.project_id

  initial_node_count = 1

  node_config {
    machine_type    = "e2-medium"
    disk_size_gb    = 50
    service_account = google_service_account.node_sa.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# ── MCP dedicated node pool ───────────────────────────────────────
resource "google_container_node_pool" "mcp" {
  name     = "mcp"
  cluster  = google_container_cluster.primary.name
  location = var.region
  project  = var.project_id

  autoscaling {
    min_node_count = var.node_min
    max_node_count = var.node_max
  }

  node_config {
    machine_type    = var.node_machine_type
    disk_size_gb    = 100
    service_account = google_service_account.node_sa.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    labels = {
      dedicated = "mcp"
      env       = var.environment
    }

    taint {
      key    = "dedicated"
      value  = "mcp"
      effect = "NO_SCHEDULE"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# ── Node service account ──────────────────────────────────────────
resource "google_service_account" "node_sa" {
  account_id   = "${var.cluster_name}-node-sa"
  display_name = "GKE Node Service Account for ${var.cluster_name}"
  project      = var.project_id
}

# ── Outputs ──────────────────────────────────────────────────────
output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "kubeconfig_command" {
  value = "gcloud container clusters get-credentials ${var.cluster_name} --region ${var.region} --project ${var.project_id}"
}
