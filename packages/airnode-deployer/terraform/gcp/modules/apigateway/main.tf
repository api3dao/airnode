resource "random_string" "api_gateway_service_account_id" {
  length  = 20
  lower   = true
  upper   = false
  special = false
  number  = false
}

resource "google_service_account" "api_gateway_service_account" {
  account_id   = random_string.api_gateway_service_account_id.result
  display_name = var.name
}

resource "google_project_iam_member" "api_gateway_monitoring_writer_role" {
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.api_gateway_service_account.email}"
  project = var.project
}

resource "google_project_iam_member" "api_gateway_logging_writer_role" {
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.api_gateway_service_account.email}"
  project = var.project
}

resource "google_cloudfunctions_function_iam_member" "invoker" {
  for_each = var.invoke_targets

  cloud_function = each.value
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.api_gateway_service_account.email}"
  project        = var.project
}

resource "google_api_gateway_api" "api_gateway_api" {
  provider = google-beta

  api_id       = lower(var.name)
  display_name = var.name
}

resource "google_api_gateway_api_config" "api_gateway_api_config" {
  provider = google-beta

  api = google_api_gateway_api.api_gateway_api.api_id
  # Generating a suffix manually because the one generated with `api_config_id_prefix` is far too long
  api_config_id = lower("${var.name}-${substr(uuid(), 0, 8)}")
  display_name  = var.name

  openapi_documents {
    document {
      path     = "spec.yaml"
      contents = base64encode(templatefile(var.template_file, var.template_variables))
    }
  }

  gateway_config {
    backend_config {
      google_service_account = google_service_account.api_gateway_service_account.email
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_api_gateway_gateway" "api_gateway_api_gateway" {
  provider = google-beta

  api_config   = google_api_gateway_api_config.api_gateway_api_config.id
  gateway_id   = lower(var.name)
  display_name = var.name
}
