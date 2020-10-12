variable "region" {
  type    = string
  default = "us-east-1"
}

variable "providerId" {
  type    = string
  default = ""
}

variable "mnemonic" {
  type    = string
  default = ""
}

// ~~~~~ Variables set at sensitive.auto.tfvars ~~~~~
variable "aws_access_key_id" {}
variable "aws_secret_key" {}
