terraform {
  required_version = "~> 1.17"

  backend "s3" {
    key      = "terraform.tfstate"
    profile  = ""
    role_arn = ""
    encrypt  = "true"
  }
}
