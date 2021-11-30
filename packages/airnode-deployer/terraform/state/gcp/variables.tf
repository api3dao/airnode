variable "gcp_project" {
  description = "GCP project for deployment"
}

variable "gcp_region" {
  description = "GCP region for deployment"
  default     = "us-east1"
}

variable "stage" {
  description = "Infrastructure environment"
  default     = "testing"
}

variable "infrastructure_name" {
  description = "Infrastructure name"
  default     = "airnode"
}

variable "airnode_address_short" {
  description = "Airnode address (short)"
}
