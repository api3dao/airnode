terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 3.90"
    }
  }

  required_version = ">= 0.14.9"
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}
