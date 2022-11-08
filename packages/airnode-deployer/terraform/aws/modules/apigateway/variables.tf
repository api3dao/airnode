variable "name" {
  description = "APIGateway name"
}

variable "stage" {
  description = "Stage name"
}

variable "template_file" {
  description = "OpenAPI template file"
}

variable "template_variables" {
  description = "Template variables for OpenAPI template file"
  type        = map(any)
  default     = {}
}

variable "lambdas" {
  description = "Lambda ARNs the APIGateway can access"
  type        = list(string)
  default     = []
}
