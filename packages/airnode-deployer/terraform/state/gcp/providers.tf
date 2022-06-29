terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.7"
    }
  }

  required_version = ">= 0.15.5"
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}
