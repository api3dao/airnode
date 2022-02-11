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

module "run" {
  source = "./modules/function"

  name               = "${local.name_prefix}-run"
  entry_point        = "run"
  source_dir         = var.handler_dir
  memory_size        = 1024
  timeout            = 30
  configuration_file = var.configuration_file
  secrets_file       = var.secrets_file
  region             = var.gcp_region
  project            = var.gcp_project
  max_instances      = var.disable_concurrency_reservation ? null : var.max_concurrency

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
  max_instances     = var.disable_concurrency_reservation ? null : 1
  invoke_targets    = [module.run.function_name]

  depends_on = [
    google_project_service.management_apis,
    module.run,
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

  max_instances = var.disable_concurrency_reservation ? null : var.api_max_concurrency

  depends_on = [
    google_project_service.management_apis,
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
