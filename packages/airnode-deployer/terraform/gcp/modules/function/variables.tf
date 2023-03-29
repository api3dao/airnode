locals {
  uuid        = uuid()
  tmp_dir     = "/tmp/${var.name}#${local.uuid}"
  tmp_archive = "/tmp/${var.name}#${local.uuid}.zip"
  # Two locations, which are called europe-west and us-central in App Engine commands and in the Google Cloud console,
  # are called europe-west1 and us-central1, respectively, elsewhere in Google documentation.
  # https://cloud.google.com/appengine/docs/locations
  app_engine_location_id = var.region == "europe-west1" ? "europe-west" : (var.region == "us-central1" ? "us-central" : var.region)

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
  type        = map(string)
  default     = {}
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

variable "airnode_bucket" {
  description = "Common Airnode bucket"
}

variable "deployment_bucket_dir" {
  description = "Directory of the current deployment within the common Airnode bucket"
}