locals {
  uuid        = uuid()
  tmp_dir     = "/tmp/${var.name}#${local.uuid}"
  tmp_archive = "/tmp/${var.name}#${local.uuid}.zip"
  # Two locations, which are called europe-west and us-central in App Engine commands and in the Google Cloud console,
  # are called europe-west1 and us-central1, respectively, elsewhere in Google documentation.
  # https://cloud.google.com/appengine/docs/locations
  app_engine_location_id = var.region == "europe-west1" ? "europe-west" : (var.region == "us-central1" ? "us-central" : var.region)
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

variable "airnode_bucket" {
  description = "Common Airnode bucket"
}

variable "deployment_bucket_dir" {
  description = "Directory of the current deployment within the common Airnode bucket"
}