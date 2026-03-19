# ─────────────────────────────────────────────────────────────────
# PERF — GKE cluster
# ─────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.8"
  backend "gcs" {
    bucket = "your-terraform-state-bucket"  # TODO
    prefix = "grafana-mcp/perf"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "gke_perf" {
  source = "../../modules/gke"

  project_id        = var.project_id
  cluster_name      = "perf-gke"
  region            = var.region
  environment       = "perf"
  node_machine_type = "n2-standard-4"
  node_min          = 2
  node_max          = 8
}

variable "project_id" {
  type = string
  # TODO: set via TF_VAR_project_id env var
}

variable "region" {
  type    = string
  default = "us-central1"
}

output "cluster_name" {
  value = module.gke_perf.cluster_name
}

output "kubeconfig_command" {
  value = module.gke_perf.kubeconfig_command
}
