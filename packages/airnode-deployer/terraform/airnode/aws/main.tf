# TODO:
# * switch between local and remote lambda source
# * variable validation

module "run" {
  source = "./modules/function"

  name                           = "${local.name_prefix}-run"
  handler                        = "index.run"
  source_dir                     = var.handler_dir
  memory_size                    = 768
  timeout                        = 32
  configuration_file             = var.configuration_file
  secrets_file                   = var.secrets_file
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : var.max_concurrency
}

module "startCoordinator" {
  source = "./modules/function"

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  environment_variables = {
    HTTP_GATEWAY_URL             = var.http_api_key == null ? null : "${module.httpGw[0].api_url}"
    HTTP_SIGNED_DATA_GATEWAY_URL = var.http_signed_data_api_key == null ? null : "${module.httpSignedGw[0].api_url}"
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "httpReq" {
  source = "./modules/function"
  count  = var.http_api_key == null ? 0 : 1

  name                           = "${local.name_prefix}-httpReq"
  handler                        = "index.httpReq"
  source_dir                     = var.handler_dir
  memory_size                    = 128
  timeout                        = 15
  configuration_file             = var.configuration_file
  secrets_file                   = var.secrets_file
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : var.http_max_concurrency
}

module "httpGw" {
  source = "./modules/apigateway"
  count  = var.http_api_key == null ? 0 : 1

  name          = "${local.name_prefix}-httpGw"
  stage         = "v1"
  template_file = "./templates/httpGw.yaml.tpl"
  template_variables = {
    proxy_lambda = module.httpReq[0].lambda_arn
    region       = var.aws_region
  }
  lambdas = [
    module.httpReq[0].lambda_arn
  ]
  api_key = var.http_api_key
}

module "httpSignedReq" {
  source = "./modules/function"
  count  = var.http_signed_data_api_key == null ? 0 : 1

  name                           = "${local.name_prefix}-httpSignedReq"
  handler                        = "index.httpSignedReq"
  source_dir                     = var.handler_dir
  memory_size                    = 128
  timeout                        = 15
  configuration_file             = var.configuration_file
  secrets_file                   = var.secrets_file
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : var.http_signed_data_max_concurrency
}

module "httpSignedGw" {
  source = "./modules/apigateway"
  count  = var.http_signed_data_api_key == null ? 0 : 1

  name          = "${local.name_prefix}-httpSignedGw"
  stage         = "v1"
  template_file = "./templates/httpSignedGw.yaml.tpl"
  template_variables = {
    proxy_lambda = module.httpSignedReq[0].lambda_arn
    region       = var.aws_region
  }
  lambdas = [
    module.httpSignedReq[0].lambda_arn
  ]
  api_key = var.http_signed_data_api_key
}
