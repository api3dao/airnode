# TODO:
# * switch between local and remote lambda source
# * variable validation

module "initializeProvider" {
  source = "./modules/function"

  name                  = "initializeProvider"
  handler               = "handlers/aws/index.initializeProvider"
  source_file           = var.handler_file
  timeout               = 20
  infrastructure_name   = var.infrastructure_name
  stage                 = var.stage
  airnode_address_short = var.airnode_address_short
  configuration_file    = var.configuration_file
  secrets_file          = var.secrets_file
}

module "callApi" {
  source = "./modules/function"

  name                  = "callApi"
  handler               = "handlers/aws/index.callApi"
  source_file           = var.handler_file
  timeout               = 30
  infrastructure_name   = var.infrastructure_name
  stage                 = var.stage
  airnode_address_short = var.airnode_address_short
  configuration_file    = var.configuration_file
  secrets_file          = var.secrets_file
}

module "processProviderRequests" {
  source = "./modules/function"

  name                  = "processProviderRequests"
  handler               = "handlers/aws/index.processProviderRequests"
  source_file           = var.handler_file
  timeout               = 10
  infrastructure_name   = var.infrastructure_name
  stage                 = var.stage
  airnode_address_short = var.airnode_address_short
  configuration_file    = var.configuration_file
  secrets_file          = var.secrets_file
}

module "startCoordinator" {
  source = "./modules/function"

  name                  = "startCoordinator"
  handler               = "handlers/aws/index.startCoordinator"
  source_file           = var.handler_file
  timeout               = 60
  infrastructure_name   = var.infrastructure_name
  stage                 = var.stage
  airnode_address_short = var.airnode_address_short
  configuration_file    = var.configuration_file
  secrets_file          = var.secrets_file

  invoke_targets                 = [module.initializeProvider.lambda_arn, module.callApi.lambda_arn, module.processProviderRequests.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = 1

  depends_on = [module.initializeProvider, module.callApi, module.processProviderRequests]
}
