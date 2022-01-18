resource "google_project_service" "management_apis" {
  for_each = toset([
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudscheduler.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
  ])
  service = each.key

  disable_dependent_services = true
  disable_on_destroy = true
}

module "initializeProvider" {
  source = "./modules/function"

  name               = "${local.name_prefix}-initializeProvider"
  entry_point        = "initializeProvider"
  source_dir         = var.handler_dir
  memory_size        = 1024
  timeout            = 17
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region

  depends_on = [
    google_project_service.management_apis
  ]
}

module "callApi" {
  source = "./modules/function"

  name               = "${local.name_prefix}-callApi"
  entry_point        = "callApi"
  source_dir         = var.handler_dir
  memory_size        = 256
  timeout            = 10
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region

  depends_on = [
    google_project_service.management_apis
  ]
}

module "processProviderRequests" {
  source = "./modules/function"

  name               = "${local.name_prefix}-processProviderRequests"
  entry_point        = "processProviderRequests"
  source_dir         = var.handler_dir
  memory_size        = 1024
  timeout            = 32
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region

  depends_on = [
    google_project_service.management_apis
  ]
}

module "startCoordinator" {
  source = "./modules/function"

  name               = "${local.name_prefix}-startCoordinator"
  entry_point        = "startCoordinator"
  source_dir         = var.handler_dir
  memory_size        = 256
  timeout            = 65
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region

  schedule_interval = 1
  max_instances     = 1
  invoke_targets    = [module.initializeProvider.function_name, module.callApi.function_name, module.processProviderRequests.function_name]

  depends_on = [
    google_project_service.management_apis,
    module.initializeProvider,
    module.callApi,
    module.processProviderRequests
  ]
}
