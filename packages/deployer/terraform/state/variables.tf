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

variable "airnode_id_short" {
  description = "Airnode ID (short)"
}
