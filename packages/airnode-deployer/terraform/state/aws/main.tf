module "terraform_state_backend_aws" {
  source        = "cloudposse/tfstate-backend/aws"
  version       = "0.33.0"
  namespace     = lower(var.infrastructure_name)
  environment   = lower(var.airnode_address_short)
  stage         = lower(var.stage)
  name          = "terraform"
  delimiter     = "-"
  force_destroy = true
}
