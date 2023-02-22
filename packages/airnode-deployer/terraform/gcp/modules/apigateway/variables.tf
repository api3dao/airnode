variable "name" {
  description = "APIGateway name"
}

variable "template_file" {
  description = "OpenAPI template file"
}

variable "template_variables" {
  description = "Template variables for OpenAPI template file"
  type        = map(any)
  default     = {}
}

variable "invoke_targets" {
  description = "Names of cloud functions that can be invoked from the APIGateway"
  type        = map(string)
  default     = {}
}

variable "project" {
  description = "GCP project"
}
