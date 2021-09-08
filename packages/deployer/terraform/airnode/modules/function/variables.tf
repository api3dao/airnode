locals {
  name = "${var.infrastructure_name}-${var.airnode_address_short}-${var.stage}-${var.name}"

  tmp_dir               = "/tmp/${var.name}-${random_uuid.uuid.result}"
  tmp_input_dir         = "${local.tmp_dir}/input"
  tmp_source_dir        = "${local.tmp_input_dir}/handlers/aws"
  tmp_configuration_dir = "${local.tmp_input_dir}/config-data"
  tmp_output_dir        = "${local.tmp_dir}/output"
}

variable "handler" {
  description = "Lambda handler in a form of `file.function`"
}

variable "source_file" {
  description = "File with the source code for lambda function"
}

variable "timeout" {
  description = "Lambda function timeout in seconds"
  default     = 10
}

variable "reserved_concurrent_executions" {
  description = "Amount of reserved concurrent executions for this lambda function"
  default     = -1
}

variable "invoke_targets" {
  description = "ARNs of other lambda functions that can be invoked from the lambda function"
  type        = list(string)
  default     = []
}

variable "schedule_interval" {
  description = "How often should the lambda function run in minutes"
  default     = 0
}

variable "name" {
  description = "Lambda name"
}

variable "infrastructure_name" {
  description = "Infrastructure name"
}

variable "stage" {
  description = "Infrastructure environment"
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
