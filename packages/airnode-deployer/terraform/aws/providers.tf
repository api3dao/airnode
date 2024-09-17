terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.67"
    }
  }

  required_version = "~> 1.4"
}

provider "aws" {
  region = var.aws_region
}
