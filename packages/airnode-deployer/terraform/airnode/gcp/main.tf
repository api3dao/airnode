module "initializeProvider" {
  source = "./modules/function"

  name               = "${local.name_prefix}-initializeProvider"
  entry_point        = "initializeProvider"
  source_dir         = var.handler_dir
  timeout            = 20
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
}

module "callApi" {
  source = "./modules/function"

  name               = "${local.name_prefix}-callApi"
  entry_point        = "callApi"
  source_dir         = var.handler_dir
  timeout            = 30
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
}

module "processProviderRequests" {
  source = "./modules/function"

  name               = "${local.name_prefix}-processProviderRequests"
  entry_point        = "processProviderRequests"
  source_dir         = var.handler_dir
  timeout            = 10
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
}

module "startCoordinator" {
  source = "./modules/function"

  name               = "${local.name_prefix}-startCoordinator"
  entry_point        = "startCoordinator"
  source_dir         = var.handler_dir
  timeout            = 60
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region

  schedule_interval = 1
  max_instances     = 1
  invoke_targets    = [module.initializeProvider.function_name, module.callApi.function_name, module.processProviderRequests.function_name]

  depends_on = [module.initializeProvider, module.callApi, module.processProviderRequests]
}
