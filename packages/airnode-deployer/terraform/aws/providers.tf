terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.63"
    }
  }

  required_version = "~> 1.4"
}

provider "aws" {
  region = var.aws_region
}
