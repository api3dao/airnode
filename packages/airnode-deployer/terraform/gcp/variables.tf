locals {
  # Be aware when using `name-prefix` for naming resources
  # as it can be up to 32 characters long:
  #
  # infrastructure_name - "airnode" - 7 characters
  # airnode_address_short - 7 characters
  # stage - up to 16 characters
  # dashes between - 2 characters
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

variable "http_gateway_enabled" {
  description = "Flag to enable HTTP Gateway"
  default     = false
}

variable "http_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode HTTP Gateway Cloud Function"
  default     = 0
}

variable "http_signed_data_gateway_enabled" {
  description = "Flag to enable Signed Data Gateway"
  default     = false
}

variable "http_signed_data_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode Signed Data Gateway Cloud Function"
  default     = 0
}

variable "airnode_wallet_private_key" {
  description = "Airnode wallet private key"
  default     = null
}

variable "airnode_bucket" {
  description = "Common Airnode bucket"
}

variable "deployment_bucket_dir" {
  description = "Directory of the current deployment within the common Airnode bucket"
}
