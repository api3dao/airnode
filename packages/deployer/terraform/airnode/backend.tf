terraform {
  required_version = ">= 0.14.9"

  backend "s3" {
    key      = "terraform.tfstate"
    profile  = ""
    role_arn = ""
    encrypt  = "true"
  }
}
