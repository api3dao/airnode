# TODO:
# * switch between local and remote lambda source
# * variable validation

module "initializeProvider" {
  source = "./modules/function"

  name               = "${local.name_prefix}-initializeProvider"
  handler            = "index.initializeProvider"
  source_dir         = var.handler_dir
  memory_size        = 768
  timeout            = 20
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  environment_variables = {
    HTTP_GATEWAY_URL = var.api_key == null ? null : "${module.testApiGateway[0].api_url}/test"
  }
}

module "callApi" {
  source = "./modules/function"

  name               = "${local.name_prefix}-callApi"
  handler            = "index.callApi"
  source_dir         = var.handler_dir
  timeout            = 30
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  memory_size        = 768
  environment_variables = {
    HTTP_GATEWAY_URL = var.api_key == null ? null : "${module.testApiGateway[0].api_url}/test"
  }
}

module "processProviderRequests" {
  source = "./modules/function"

  name               = "${local.name_prefix}-processProviderRequests"
  handler            = "index.processProviderRequests"
  source_dir         = var.handler_dir
  memory_size        = 768
  timeout            = 10
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  environment_variables = {
    HTTP_GATEWAY_URL = var.api_key == null ? null : "${module.testApiGateway[0].api_url}/test"
  }
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
    HTTP_GATEWAY_URL = var.api_key == null ? null : "${module.testApiGateway[0].api_url}/test"
  }

  invoke_targets                 = [module.initializeProvider.lambda_arn, module.callApi.lambda_arn, module.processProviderRequests.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = 1

  depends_on = [module.initializeProvider, module.callApi, module.processProviderRequests]
}

module "testApi" {
  source = "./modules/function"
  count  = var.api_key == null ? 0 : 1

  name               = "${local.name_prefix}-testApi"
  handler            = "index.testApi"
  source_dir         = var.handler_dir
  memory_size        = 256
  timeout            = 15
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  invoke_targets = [module.callApi.lambda_arn]
}

module "testApiGateway" {
  source = "./modules/apigateway"
  count  = var.api_key == null ? 0 : 1

  name          = "${local.name_prefix}-testApiGateway"
  stage         = "v1"
  template_file = "./templates/apigateway.yaml.tpl"
  template_variables = {
    proxy_lambda = module.testApi[0].lambda_arn
    region       = var.aws_region
  }
  lambdas = [
    module.testApi[0].lambda_arn
  ]
  api_key = var.api_key
}
