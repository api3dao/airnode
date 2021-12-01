module "terraform_state_backend_aws" {
  source        = "cloudposse/tfstate-backend/aws"
  version       = "0.33.0"
  namespace     = var.infrastructure_name
  environment   = var.airnode_address_short
  stage         = var.stage
  name          = "terraform"
  delimiter     = "-"
  force_destroy = true
}
