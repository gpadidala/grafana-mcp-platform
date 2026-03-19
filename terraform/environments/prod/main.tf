# ─────────────────────────────────────────────────────────────────
# PROD — EKS cluster
# ─────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.8"
  backend "s3" {
    bucket = "your-terraform-state-bucket"  # TODO
    key    = "grafana-mcp/prod/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region
}

module "eks_prod" {
  source = "../../modules/eks"

  cluster_name       = "prod-eks"
  region             = var.aws_region
  environment        = "prod"
  node_instance_type = "m5.xlarge"
  node_min           = 3
  node_max           = 12

  tags = {
    Environment = "prod"
    ManagedBy   = "terraform"
    Project     = "grafana-mcp-platform"
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

output "cluster_name" {
  value = module.eks_prod.cluster_name
}

output "kubeconfig_command" {
  value = module.eks_prod.kubeconfig_command
}
