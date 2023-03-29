resource "random_uuid" "http_path_key" {
}

resource "random_uuid" "http_signed_data_path_key" {
}

resource "random_uuid" "oev_path_key" {
}

resource "google_project_service" "resourcemanager_api" {
  service = "cloudresourcemanager.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_project_service" "management_apis" {
  for_each = toset([
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudscheduler.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
  ])
  service = each.key

  disable_dependent_services = false
  disable_on_destroy         = false

  depends_on = [
    google_project_service.resourcemanager_api
  ]
}

module "run" {
  source = "./modules/function"

  name                  = "${local.name_prefix}-run"
  entry_point           = "run"
  source_dir            = var.handler_dir
  memory_size           = 1024
  timeout               = 30
  configuration_file    = var.configuration_file
  secrets_file          = var.secrets_file
  region                = var.gcp_region
  project               = var.gcp_project
  max_instances         = var.disable_concurrency_reservation ? null : var.max_concurrency
  airnode_bucket        = var.airnode_bucket
  deployment_bucket_dir = var.deployment_bucket_dir
  environment_variables = {
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }

  depends_on = [
    google_project_service.management_apis
  ]
}

module "startCoordinator" {
  source = "./modules/function"

  name               = "${local.name_prefix}-startCoordinator"
  entry_point        = "startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
  project            = var.gcp_project
  schedule_interval  = 1
  max_instances      = var.disable_concurrency_reservation ? null : 1
  invoke_targets = {
    run = module.run.function_name
  }
  airnode_bucket        = var.airnode_bucket
  deployment_bucket_dir = var.deployment_bucket_dir
  environment_variables = {
    HTTP_GATEWAY_URL             = local.http_gateway_url
    HTTP_SIGNED_DATA_GATEWAY_URL = local.http_signed_data_gateway_url
    OEV_GATEWAY_URL              = local.oev_gateway_url
    AIRNODE_WALLET_PRIVATE_KEY   = var.airnode_wallet_private_key
  }

  depends_on = [
    google_project_service.management_apis,
    module.run,
  ]
}

resource "google_project_service" "apigateway_api" {
  count = var.http_gateway_enabled || var.http_signed_data_gateway_enabled ? 1 : 0

  service = "apigateway.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false

  depends_on = [
    google_project_service.resourcemanager_api
  ]
}

resource "google_project_service" "servicecontrol_api" {
  count = var.http_gateway_enabled || var.http_signed_data_gateway_enabled ? 1 : 0

  service = "servicecontrol.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false

  depends_on = [
    google_project_service.resourcemanager_api
  ]
}

module "httpReq" {
  source = "./modules/function"
  count  = var.http_gateway_enabled ? 1 : 0

  name                  = "${local.name_prefix}-httpReq"
  entry_point           = "httpReq"
  source_dir            = var.handler_dir
  memory_size           = 128
  timeout               = 30
  configuration_file    = var.configuration_file
  secrets_file          = var.secrets_file
  region                = var.gcp_region
  project               = var.gcp_project
  airnode_bucket        = var.airnode_bucket
  deployment_bucket_dir = var.deployment_bucket_dir
  max_instances         = var.disable_concurrency_reservation ? null : var.http_max_concurrency

  depends_on = [
    google_project_service.management_apis,
  ]
}

module "httpGw" {
  source = "./modules/apigateway"
  count  = var.http_gateway_enabled ? 1 : 0

  name          = "${local.name_prefix}-httpGw"
  template_file = "./templates/httpGw.yaml.tpl"
  template_variables = {
    project             = var.gcp_project
    region              = var.gcp_region
    cloud_function_name = module.httpReq[0].function_name
    path_key            = random_uuid.http_path_key.result
  }
  project = var.gcp_project

  invoke_targets = {
    httpReq = module.httpReq[0].function_name
  }

  depends_on = [
    google_project_service.apigateway_api,
    google_project_service.servicecontrol_api,
    module.httpReq,
  ]
}

module "httpSignedReq" {
  source = "./modules/function"
  count  = var.http_signed_data_gateway_enabled ? 1 : 0

  name                  = "${local.name_prefix}-httpSignedReq"
  entry_point           = "httpSignedReq"
  source_dir            = var.handler_dir
  memory_size           = 128
  timeout               = 30
  configuration_file    = var.configuration_file
  secrets_file          = var.secrets_file
  region                = var.gcp_region
  project               = var.gcp_project
  max_instances         = var.disable_concurrency_reservation ? null : var.http_signed_data_max_concurrency
  airnode_bucket        = var.airnode_bucket
  deployment_bucket_dir = var.deployment_bucket_dir
  environment_variables = {
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }

  depends_on = [
    google_project_service.management_apis,
  ]
}

module "httpSignedGw" {
  source = "./modules/apigateway"
  count  = var.http_signed_data_gateway_enabled ? 1 : 0

  name          = "${local.name_prefix}-httpSignedGw"
  template_file = "./templates/httpSignedGw.yaml.tpl"
  template_variables = {
    project             = var.gcp_project
    region              = var.gcp_region
    cloud_function_name = module.httpSignedReq[0].function_name
    path_key            = random_uuid.http_signed_data_path_key.result
  }
  project = var.gcp_project

  invoke_targets = {
    httpSignedReq = module.httpSignedReq[0].function_name
  }

  depends_on = [
    google_project_service.apigateway_api,
    google_project_service.servicecontrol_api,
    module.httpSignedReq,
  ]
}

module "signOevReq" {
  source = "./modules/function"
  count  = var.oev_gateway_enabled ? 1 : 0

  name                  = "${local.name_prefix}-signOevReq"
  entry_point           = "signOevReq"
  source_dir            = var.handler_dir
  memory_size           = 256
  timeout               = 30
  configuration_file    = var.configuration_file
  secrets_file          = var.secrets_file
  region                = var.gcp_region
  project               = var.gcp_project
  max_instances         = var.disable_concurrency_reservation ? null : var.oev_max_concurrency
  airnode_bucket        = var.airnode_bucket
  deployment_bucket_dir = var.deployment_bucket_dir
  environment_variables = {
    AIRNODE_WALLET_PRIVATE_KEY = var.airnode_wallet_private_key
  }

  depends_on = [
    google_project_service.management_apis,
  ]
}

module "oevGw" {
  source = "./modules/apigateway"
  count  = var.oev_gateway_enabled ? 1 : 0

  name          = "${local.name_prefix}-oevGw"
  template_file = "./templates/oevGw.yaml.tpl"
  template_variables = {
    project             = var.gcp_project
    region              = var.gcp_region
    cloud_function_name = module.signOevReq[0].function_name
    path_key            = random_uuid.oev_path_key.result
  }
  project = var.gcp_project

  invoke_targets = {
    signOevReq = module.signOevReq[0].function_name
  }

  depends_on = [
    google_project_service.apigateway_api,
    google_project_service.servicecontrol_api,
    module.signOevReq,
  ]
}
