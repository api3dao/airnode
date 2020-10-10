provider "aws" {
  region  = var.region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_key
}

resource "aws_ssm_parameter" "masterKeyMnemonic" {
  name        = "/masterKeyMnemonic/${var.providerId}"
  type        = "SecureString"
  value       = var.mnemonic
  description = "Mnemonic of the master private key"
  tier        = "Standard"
  overwrite   = false
}
