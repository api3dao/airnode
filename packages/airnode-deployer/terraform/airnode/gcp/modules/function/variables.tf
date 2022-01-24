locals {
  tmp_dir               = "/tmp/${var.name}-${random_uuid.uuid.result}"
  tmp_input_dir         = "${local.tmp_dir}/input"
  tmp_configuration_dir = "${local.tmp_input_dir}/config-data"
  tmp_handlers_dir      = "${local.tmp_input_dir}/handlers"
  tmp_output_dir        = "${local.tmp_dir}/output"
}

variable "entry_point" {
  description = "Cloud function entry point"
}

variable "source_dir" {
  description = "Directory with the source code for cloud function"
}

variable "timeout" {
  description = "Cloud function timeout in seconds"
  default     = 10
}

variable "invoke_targets" {
  description = "Names of other cloud functions that can be invoked from the cloud function"
  type        = list(string)
  default     = []
}

variable "schedule_interval" {
  description = "How often should the cloud function run in minutes"
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of function instances"
  default     = 0
}

variable "name" {
  description = "Cloud function name"
}

variable "configuration_file" {
  description = "Airnode configuration file"
}

variable "secrets_file" {
  description = "Airnode secrets file"
}

variable "environment_variables" {
  description = "Additional cloud function environment variables"
  type        = map(any)
  default     = {}
}

variable "region" {
  description = "GCP region"
}

variable "project" {
  description = "GCP project"
}

variable "memory_size" {
  description = "GCP memory allocation"
}
