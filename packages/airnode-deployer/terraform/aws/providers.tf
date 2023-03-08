terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.57"
    }
  }

  required_version = "~> 1.3"
}

provider "aws" {
  region = var.aws_region
}
