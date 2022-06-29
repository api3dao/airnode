terraform {
  required_version = ">= 0.15.5"

  backend "s3" {
    key      = "terraform.tfstate"
    profile  = ""
    role_arn = ""
    encrypt  = "true"
  }
}
