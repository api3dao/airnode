# TODO:
# * switch between local and remote lambda source
# * variable validation

module "initializeProvider" {
  source = "./modules/function"

  name                = "initializeProvider"
  handler             = "handlers/aws/index.initializeProvider"
  source_file         = "${path.module}/../../.webpack/handlers/aws/index.js"
  timeout             = 20
  infrastructure_name = var.infrastructure_name
  stage               = var.stage
  airnode_id_short    = var.airnode_id_short
  configuration_file  = var.configuration_file
  secrets_file        = var.secrets_file
}

module "callApi" {
  source = "./modules/function"

  name                = "callApi"
  handler             = "handlers/aws/index.callApi"
  source_file         = "${path.module}/../../.webpack/handlers/aws/index.js"
  timeout             = 30
  infrastructure_name = var.infrastructure_name
  stage               = var.stage
  airnode_id_short    = var.airnode_id_short
  configuration_file  = var.configuration_file
  secrets_file        = var.secrets_file
}

module "processProviderRequests" {
  source = "./modules/function"

  name                = "processProviderRequests"
  handler             = "handlers/aws/index.processProviderRequests"
  source_file         = "${path.module}/../../.webpack/handlers/aws/index.js"
  timeout             = 10
  infrastructure_name = var.infrastructure_name
  stage               = var.stage
  airnode_id_short    = var.airnode_id_short
  configuration_file  = var.configuration_file
  secrets_file        = var.secrets_file
}

module "startCoordinator" {
  source = "./modules/function"

  name                = "startCoordinator"
  handler             = "handlers/aws/index.startCoordinator"
  source_file         = "${path.module}/../../.webpack/handlers/aws/index.js"
  timeout             = 60
  infrastructure_name = var.infrastructure_name
  stage               = var.stage
  airnode_id_short    = var.airnode_id_short
  configuration_file  = var.configuration_file
  secrets_file        = var.secrets_file

  invoke_targets                 = [module.initializeProvider.lambda_arn, module.callApi.lambda_arn, module.processProviderRequests.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = 1

  depends_on = [module.initializeProvider, module.callApi, module.processProviderRequests]
}
