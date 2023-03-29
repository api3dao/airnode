locals {
  # Be aware when using `name-prefix` for naming resources
  # as it can be up to 19 characters long:
  #
  # infrastructure_name - "airnode" - 7 characters
  # deployment_id - 11 characters
  # dash between - 1 character
  name_prefix = "${var.infrastructure_name}-${var.deployment_id}"

  http_gateway_url             = var.http_gateway_enabled == false ? null : "${module.httpGw[0].api_url}/${random_uuid.http_path_key.result}"
  http_signed_data_gateway_url = var.http_signed_data_gateway_enabled == false ? null : "${module.httpSignedGw[0].api_url}/${random_uuid.http_signed_data_path_key.result}"
  oev_gateway_url              = var.oev_gateway_enabled == false ? null : "${module.oevGw[0].api_url}/${random_uuid.oev_path_key.result}"
}

variable "aws_region" {
  description = "AWS region for deployment"
  default     = "us-east-1"
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
  description = "Maximum amount of concurrent executions for Airnode Run Lambda"
  type        = number
  default     = -1
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
  description = "Maximum amount of concurrent executions for Airnode HTTP Gateway Lambda"
  type        = number
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function#reserved_concurrent_executions
  default = -1
}

variable "http_signed_data_gateway_enabled" {
  description = "Flag to enable Signed Data Gateway"
  type        = bool
  default     = false
}

variable "http_signed_data_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode Signed Data Gateway Lambda"
  type        = number
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function#reserved_concurrent_executions
  default = -1
}

variable "oev_gateway_enabled" {
  description = "Flag to enable OEV Gateway"
  type        = bool
  default     = false
}

variable "oev_max_concurrency" {
  description = "Maximum amount of concurrent executions for Airnode OEV Gateway Lambda"
  type        = number
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function#reserved_concurrent_executions
  default = -1
}

variable "airnode_wallet_private_key" {
  description = "Airnode wallet private key"
}
