variable "region" {
  type    = string
  default = "us-east-1"
}

variable "providerId" {
  type    = string
}

variable "mnemonic" {
  type    = string
}

// ~~~~~ Variables set at sensitive.auto.tfvars ~~~~~
variable "aws_access_key_id" {}
variable "aws_secret_key" {}
