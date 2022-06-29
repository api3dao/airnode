terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.71"
    }
  }

  required_version = ">= 0.15.5"
}

provider "aws" {
  profile = "default"
  region  = var.aws_region
}
