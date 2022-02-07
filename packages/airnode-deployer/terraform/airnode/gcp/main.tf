resource "google_project_service" "resourcemanager_api" {
  service = "cloudresourcemanager.googleapis.com"

  disable_dependent_services = true
  disable_on_destroy         = true
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

  disable_dependent_services = true
  disable_on_destroy         = true

  depends_on = [
    google_project_service.resourcemanager_api
  ]
}

module "initializeProvider" {
  source = "./modules/function"

  name               = "${local.name_prefix}-initializeProvider"
  entry_point        = "initializeProvider"
  source_dir         = var.handler_dir
  memory_size        = 1024
  timeout            = 20
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
  project            = var.gcp_project

  depends_on = [
    google_project_service.management_apis
  ]
}

module "callApi" {
  source = "./modules/function"

  name               = "${local.name_prefix}-callApi"
  entry_point        = "callApi"
  source_dir         = var.handler_dir
  memory_size        = 512
  timeout            = 30
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
  project            = var.gcp_project

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
  timeout            = 10
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
  project            = var.gcp_project

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

  environment_variables = {
    HTTP_GATEWAY_URL = var.api_key == null ? null : "${module.apiGateway[0].api_url}/test"
  }

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

module "testApi" {
  source = "./modules/function"
  count  = var.api_key == null ? 0 : 1

  name               = "${local.name_prefix}-testApi"
  entry_point        = "testApi"
  source_dir         = var.handler_dir
  memory_size        = 256
  timeout            = 15
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
  project            = var.gcp_project

  environment_variables = {
    HTTP_GATEWAY_API_KEY = var.api_key
  }

  invoke_targets = [module.callApi.function_name]

  depends_on = [
    google_project_service.management_apis,
    module.callApi,
  ]
}

resource "google_project_service" "apigateway_api" {
  count = var.api_key == null ? 0 : 1

  service = "apigateway.googleapis.com"

  disable_dependent_services = true
  disable_on_destroy         = true

  depends_on = [
    google_project_service.resourcemanager_api
  ]
}

resource "google_project_service" "servicecontrol_api" {
  count = var.api_key == null ? 0 : 1

  service = "servicecontrol.googleapis.com"

  disable_dependent_services = true
  disable_on_destroy         = true

  depends_on = [
    google_project_service.resourcemanager_api
  ]
}

module "apiGateway" {
  source = "./modules/apigateway"
  count  = var.api_key == null ? 0 : 1

  name          = "${local.name_prefix}-apiGateway"
  template_file = "./templates/apigateway.yaml.tpl"
  template_variables = {
    project             = var.gcp_project
    region              = var.gcp_region
    cloud_function_name = module.testApi[0].function_name
  }
  project = var.gcp_project

  invoke_targets = [
    module.testApi[0].function_name
  ]

  depends_on = [
    google_project_service.apigateway_api,
    google_project_service.servicecontrol_api,
    module.testApi,
  ]
}
