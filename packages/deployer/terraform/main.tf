terraform {
  required_providers {
    aws = {
      source  = "-/aws"
      version = "~> 3.14.1"
    }
  }
}

provider "aws" {
  region  = var.region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_key
}

resource "aws_ssm_parameter" "masterKeyMnemonic" {
  name        = "/airnode/${var.airnodeId}/masterKeyMnemonic"
  type        = "SecureString"
  value       = var.mnemonic
  description = "Mnemonic of the master private key"
  tier        = "Standard"
  overwrite   = false
}
