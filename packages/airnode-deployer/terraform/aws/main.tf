# TODO:
# * switch between local and remote lambda source
# * variable validation

resource "random_uuid" "http_path_key" {
}

resource "random_uuid" "http_signed_data_path_key" {
}

resource "random_uuid" "oev_path_key" {
}

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

  environment_variables = {
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }
}

# We need to list all the possible gateway combinations due to some obscure Terraform bug.
# More info can be find in the issue https://github.com/api3dao/airnode/issues/1450
# and PR with a fix https://github.com/api3dao/airnode/pull/1456
module "startCoordinatorNoGws" {
  source = "./modules/function"
  count  = !var.http_gateway_enabled && !var.http_signed_data_gateway_enabled && !var.oev_gateway_enabled ? 1 : 0

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  environment_variables = {
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "startCoordinatorHttpGw" {
  source = "./modules/function"
  count  = var.http_gateway_enabled && !var.http_signed_data_gateway_enabled && !var.oev_gateway_enabled ? 1 : 0

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  environment_variables = {
    HTTP_GATEWAY_URL           = local.http_gateway_url
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "startCoordinatorHttpSignedGw" {
  source = "./modules/function"
  count  = !var.http_gateway_enabled && var.http_signed_data_gateway_enabled && !var.oev_gateway_enabled ? 1 : 0

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  environment_variables = {
    HTTP_SIGNED_DATA_GATEWAY_URL = local.http_signed_data_gateway_url
    AIRNODE_WALLET_PRIVATE_KEY   = var.airnode_wallet_private_key
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "startCoordinatorOevGw" {
  source = "./modules/function"
  count  = !var.http_gateway_enabled && !var.http_signed_data_gateway_enabled && var.oev_gateway_enabled ? 1 : 0

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  environment_variables = {
    OEV_GATEWAY_URL            = local.oev_gateway_url
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "startCoordinatorHttpGwAndHttpSignedGw" {
  source = "./modules/function"
  count  = var.http_gateway_enabled && var.http_signed_data_gateway_enabled && !var.oev_gateway_enabled ? 1 : 0

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  environment_variables = {
    HTTP_GATEWAY_URL             = local.http_gateway_url
    HTTP_SIGNED_DATA_GATEWAY_URL = local.http_signed_data_gateway_url
    AIRNODE_WALLET_PRIVATE_KEY   = var.airnode_wallet_private_key
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "startCoordinatorHttpGwAndOevGw" {
  source = "./modules/function"
  count  = var.http_gateway_enabled && !var.http_signed_data_gateway_enabled && var.oev_gateway_enabled ? 1 : 0

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  environment_variables = {
    HTTP_GATEWAY_URL           = local.http_gateway_url
    OEV_GATEWAY_URL            = local.oev_gateway_url
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "startCoordinatorHttpSignedGwAndOevGw" {
  source = "./modules/function"
  count  = !var.http_gateway_enabled && var.http_signed_data_gateway_enabled && var.oev_gateway_enabled ? 1 : 0

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  environment_variables = {
    HTTP_SIGNED_DATA_GATEWAY_URL = local.http_signed_data_gateway_url
    OEV_GATEWAY_URL              = local.oev_gateway_url
    AIRNODE_WALLET_PRIVATE_KEY   = var.airnode_wallet_private_key
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "startCoordinatorAllGws" {
  source = "./modules/function"
  count  = var.http_gateway_enabled && var.http_signed_data_gateway_enabled && var.oev_gateway_enabled ? 1 : 0

  name               = "${local.name_prefix}-startCoordinator"
  handler            = "index.startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file

  environment_variables = {
    HTTP_GATEWAY_URL             = local.http_gateway_url
    HTTP_SIGNED_DATA_GATEWAY_URL = local.http_signed_data_gateway_url
    OEV_GATEWAY_URL              = local.oev_gateway_url
    AIRNODE_WALLET_PRIVATE_KEY   = var.airnode_wallet_private_key
  }

  invoke_targets                 = [module.run.lambda_arn]
  schedule_interval              = 1
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : 1

  depends_on = [module.run]
}

module "httpReq" {
  source = "./modules/function"
  count  = var.http_gateway_enabled == false ? 0 : 1

  name                           = "${local.name_prefix}-httpReq"
  handler                        = "index.httpReq"
  source_dir                     = var.handler_dir
  memory_size                    = 128
  timeout                        = 30
  configuration_file             = var.configuration_file
  secrets_file                   = var.secrets_file
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : var.http_max_concurrency
}

module "httpGw" {
  source = "./modules/apigateway"
  count  = var.http_gateway_enabled == false ? 0 : 1

  name          = "${local.name_prefix}-httpGw"
  stage         = "v1"
  template_file = "./templates/httpGw.yaml.tpl"
  template_variables = {
    proxy_lambda = module.httpReq[0].lambda_arn
    region       = var.aws_region
    path_key     = random_uuid.http_path_key.result
  }
  lambdas = [
    module.httpReq[0].lambda_arn
  ]
}

module "httpSignedReq" {
  source = "./modules/function"
  count  = var.http_signed_data_gateway_enabled == false ? 0 : 1

  name                           = "${local.name_prefix}-httpSignedReq"
  handler                        = "index.httpSignedReq"
  source_dir                     = var.handler_dir
  memory_size                    = 128
  timeout                        = 30
  configuration_file             = var.configuration_file
  secrets_file                   = var.secrets_file
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : var.http_signed_data_max_concurrency

  environment_variables = {
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }
}

module "httpSignedGw" {
  source = "./modules/apigateway"
  count  = var.http_signed_data_gateway_enabled == false ? 0 : 1

  name          = "${local.name_prefix}-httpSignedGw"
  stage         = "v1"
  template_file = "./templates/httpSignedGw.yaml.tpl"
  template_variables = {
    proxy_lambda = module.httpSignedReq[0].lambda_arn
    region       = var.aws_region
    path_key     = random_uuid.http_signed_data_path_key.result
  }
  lambdas = [
    module.httpSignedReq[0].lambda_arn
  ]
}

module "signOevReq" {
  source = "./modules/function"
  count  = var.oev_gateway_enabled == false ? 0 : 1

  name                           = "${local.name_prefix}-signOevReq"
  handler                        = "index.signOevReq"
  source_dir                     = var.handler_dir
  memory_size                    = 256
  timeout                        = 30
  configuration_file             = var.configuration_file
  secrets_file                   = var.secrets_file
  reserved_concurrent_executions = var.disable_concurrency_reservation ? null : var.oev_max_concurrency

  environment_variables = {
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }
}

module "oevGw" {
  source = "./modules/apigateway"
  count  = var.oev_gateway_enabled == false ? 0 : 1

  name          = "${local.name_prefix}-oevGw"
  stage         = "v1"
  template_file = "./templates/oevGw.yaml.tpl"
  template_variables = {
    proxy_lambda = module.signOevReq[0].lambda_arn
    region       = var.aws_region
    path_key     = random_uuid.oev_path_key.result
  }
  lambdas = [
    module.signOevReq[0].lambda_arn
  ]
}
