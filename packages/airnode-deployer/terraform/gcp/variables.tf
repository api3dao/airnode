locals {
  # Be aware when using `name-prefix` for naming resources
  # as it can be up to 19 characters long:
  #
  # infrastructure_name - "airnode" - 7 characters
  # deployment_id - 11 characters
  # dash between - 1 character
  name_prefix = "${var.infrastructure_name}-${var.deployment_id}"
}

variable "gcp_project" {
  description = "GCP project for deployment"
}

variable "gcp_region" {
  description = "GCP region for deployment"
  default     = "us-east1"
}

variable "infrastructure_name" {
  description = "Infrastructure name"
  default     = "airnode"
}

variable "deployment_id" {
  description = "ID of the deployment"
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
  type        = number
  default     = 0
}

variable "disable_concurrency_reservation" {
  description = "Flag to disable any concurrency reservations"
  type        = bool
  default     = false
}

variable "http_gateway_enabled" {
  description = "Flag to enable HTTP Gateway"
  type        = bool
  default     = false
}

variable "http_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode HTTP Gateway Cloud Function"
  type        = number
  default     = 0
}

variable "http_signed_data_gateway_enabled" {
  description = "Flag to enable Signed Data Gateway"
  type        = bool
  default     = false
}

variable "http_signed_data_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode Signed Data Gateway Cloud Function"
  type        = number
  default     = 0
}

variable "oev_gateway_enabled" {
  description = "Flag to enable OEV Gateway"
  type        = bool
  default     = false
}

variable "oev_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode OEV Gateway Lambda"
  type        = number
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
