locals {
  name_prefix = "${var.infrastructure_name}-${var.airnode_address_short}-${var.stage}"
}

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

variable "configuration_file" {
  description = "Airnode configuration file"
}

variable "secrets_file" {
  description = "Airnode secrets file"
}

variable "handler_dir" {
  description = "Airnode handler source code directory"
}

variable "max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode Run Cloud function"
  default     = 0
}

variable "disable_concurrency_reservation" {
  description = "Flag to disable any concurrency reservations"
  default     = false
}

variable "http_api_key" {
  description = "API key to access Airnode HTTP Gateway"
  type        = string
  default     = null
}

variable "http_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode HTTP Gateway Cloud Function"
  default     = 0
}

variable "signed_data_api_key" {
  description = "API key to access Airnode Signed Data Gateway"
  type        = string
  default     = null
}

variable "signed_data_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode Signed Data Gateway Cloud Function"
  default     = 0
}
