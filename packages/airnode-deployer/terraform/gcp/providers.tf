terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.19"
    }
  }

  required_version = "~> 1.4"
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

provider "google-beta" {
  project = var.gcp_project
  region  = var.gcp_region
}
