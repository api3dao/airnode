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

variable "aws_region" {
  description = "AWS region for deployment"
  default     = "us-east-1"
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
  description = "Maximum amount of concurrent executions for Airnode Run Lambda"
  default     = -1
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
  description = "Maximum amount of concurrent executions for Airnode HTTP Gateway Lambda"
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function#reserved_concurrent_executions
  default = -1
}

variable "http_signed_data_api_key" {
  description = "API key to access Airnode Signed Data Gateway"
  type        = string
  default     = null
}

variable "http_signed_data_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode Signed Data Gateway Lambda"
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function#reserved_concurrent_executions
  default = -1
}

variable "airnode_wallet_private_key" {
  description = "Airnode wallet private key"
}
