locals {
  uuid        = uuid()
  tmp_dir     = "/tmp/${var.name}#${local.uuid}"
  tmp_archive = "/tmp/${var.name}#${local.uuid}.zip"

  # Secrets are already validated by the validator before reaching Terraform recipes. Any edge-cases that come to mind are most likely handled there.
  #
  # Read file and split it line by line. Using regex to avoid UNIX/Windows line-ending problems
  secrets_lines = fileexists(var.secrets_file) ? regexall(".*", file(var.secrets_file)) : []
  # Trim whitespaces from the line
  secrets_lines_trimmed = [for line in local.secrets_lines : trimspace(line)]
  # Discard commented lines (starting with '#')
  secrets_lines_uncommented = [for line in local.secrets_lines_trimmed : line if !startswith(line, "#")]
  # Discard lines not matching the pattern and split them. We're looking for line that has non-whitespace characters before '=' and anything after
  secrets_lines_matched = [for line in local.secrets_lines_uncommented : regex("^([^[:space:]]+?)=(.*)$", line) if can(regex("^([^[:space:]]+?)=(.*)$", line))]
  # Convert the list to a map, remove quotation marks around the values. When duplicate keys are encountered the last found value is used.
  secrets = merge([for tuple in local.secrets_lines_matched : { (tuple[0]) = trim(tuple[1], "\"'") }]...)
}

variable "handler" {
  description = "Lambda handler in a form of `file.function`"
}

variable "source_dir" {
  description = "Directory with the source code for lambda function"
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

variable "memory_size" {
  description = "Lambda memory allocation"
}

variable "configuration_file" {
  description = "Airnode configuration file"
}

variable "secrets_file" {
  description = "Airnode secrets file"
}

variable "environment_variables" {
  description = "Additional Lambda environment variables"
  type        = map(any)
  default     = {}
}
