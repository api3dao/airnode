resource "random_string" "function_service_account_id" {
  length  = 20
  lower   = true
  upper   = false
  special = false
  number  = false
}

resource "local_file" "index_js" {
  source   = "${var.source_dir}/index.js"
  filename = "${local.tmp_dir}/index.js"
}

resource "local_file" "gcp_index_js" {
  source   = "${var.source_dir}/handlers/gcp/index.js"
  filename = "${local.tmp_dir}/handlers/gcp/index.js"
}

resource "local_file" "config_json" {
  source   = var.configuration_file
  filename = "${local.tmp_dir}/config-data/config.json"
}

resource "google_service_account" "function_service_account" {
  account_id   = random_string.function_service_account_id.result
  display_name = "${var.name}-function"
}

resource "google_project_iam_member" "function_monitoring_writer_role" {
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.function_service_account.email}"
  project = var.project
}

resource "google_project_iam_member" "function_logging_writer_role" {
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.function_service_account.email}"
  project = var.project
}

resource "google_cloudfunctions_function_iam_member" "invoker" {
  for_each = var.invoke_targets

  cloud_function = each.value
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.function_service_account.email}"
  project        = var.project
}

resource "google_storage_bucket_object" "function_zip" {
  # Append file SHA1 to force bucket to be recreated
  name   = "${var.deployment_bucket_dir}/${var.name}-source#${data.archive_file.function_zip.output_sha}.zip"
  bucket = var.airnode_bucket
  source = data.archive_file.function_zip.output_path
}

resource "google_cloudfunctions_function" "function" {
  name    = var.name
  runtime = "nodejs18"

  available_memory_mb   = var.memory_size
  source_archive_bucket = google_storage_bucket_object.function_zip.bucket
  source_archive_object = google_storage_bucket_object.function_zip.name
  trigger_http          = true
  entry_point           = var.entry_point
  timeout               = var.timeout
  max_instances         = var.max_instances
  environment_variables = merge(
    var.environment_variables,
    local.secrets,
    { AIRNODE_CLOUD_PROVIDER = "gcp" }
  )
  service_account_email = google_service_account.function_service_account.email
}

resource "random_string" "scheduler_service_account_id" {
  count = var.schedule_interval == 0 ? 0 : 1

  length  = 20
  lower   = true
  upper   = false
  special = false
  number  = false
}

resource "google_app_engine_application" "app" {
  count = var.schedule_interval == 0 ? 0 : 1

  project     = data.google_project.project.project_id
  location_id = local.app_engine_location_id
}

resource "google_service_account" "scheduler_service_account" {
  count = var.schedule_interval == 0 ? 0 : 1

  account_id   = random_string.scheduler_service_account_id[0].result
  display_name = "${var.name}-scheduler"
}

resource "google_cloudfunctions_function_iam_member" "scheduler_invoker" {
  count          = var.schedule_interval == 0 ? 0 : 1
  cloud_function = google_cloudfunctions_function.function.name

  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.scheduler_service_account[0].email}"
  project = var.project
}

resource "google_cloud_scheduler_job" "scheduler_job" {
  count = var.schedule_interval == 0 ? 0 : 1

  name             = var.name
  schedule         = "*/${var.schedule_interval} * * * *"
  attempt_deadline = "${var.timeout}s"

  http_target {
    http_method = "GET"
    uri         = google_cloudfunctions_function.function.https_trigger_url

    oidc_token {
      service_account_email = google_service_account.scheduler_service_account[0].email
    }
  }

  depends_on = [
    google_app_engine_application.app
  ]
}
