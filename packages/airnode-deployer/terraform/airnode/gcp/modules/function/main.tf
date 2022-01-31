resource "random_uuid" "uuid" {
}

resource "random_string" "function_service_account_id" {
  length  = 20
  lower   = true
  upper   = false
  special = false
  number  = false
}

resource "null_resource" "fetch_function_files" {
  provisioner "local-exec" {
    command = <<EOC
rm -rf ${local.tmp_dir}
mkdir -p "${local.tmp_input_dir}" "${local.tmp_configuration_dir}"
cp -r "${var.source_dir}/." "${local.tmp_input_dir}"
rm -rf "${local.tmp_handlers_dir}"
mkdir -p "${local.tmp_handlers_dir}"
cp -r "${var.source_dir}/handlers/gcp" "${local.tmp_handlers_dir}/gcp"
cp "${var.configuration_file}" "${local.tmp_configuration_dir}"
EOC
  }

  triggers = {
    // Run always
    trigger = uuid()
  }
}

resource "google_service_account" "function_service_account" {
  account_id   = random_string.function_service_account_id.result
  display_name = "${var.name}-service-account"
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
  for_each = toset(var.invoke_targets)

  cloud_function = each.key
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.function_service_account.email}"
  project        = var.project
}

resource "google_storage_bucket" "function_bucket" {
  name                        = lower("${var.name}-code")
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}

resource "google_storage_bucket_object" "function_zip" {
  # Append file SHA256 to force bucket to be recreated
  name   = "${var.name}-source.zip#${data.archive_file.function_zip.output_base64sha256}"
  bucket = google_storage_bucket.function_bucket.name
  source = data.archive_file.function_zip.output_path
}

resource "google_cloudfunctions_function" "function" {
  name    = var.name
  runtime = "nodejs14"

  available_memory_mb   = var.memory_size
  source_archive_bucket = google_storage_bucket.function_bucket.name
  source_archive_object = google_storage_bucket_object.function_zip.name
  trigger_http          = true
  entry_point           = var.entry_point
  timeout               = var.timeout
  max_instances         = var.max_instances
  environment_variables = merge(merge(var.environment_variables, fileexists(var.secrets_file) ? jsondecode(file(var.secrets_file)) : {}), { AIRNODE_CLOUD_PROVIDER = "gcp" })
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
  location_id = var.region
}

resource "google_service_account" "scheduler_service_account" {
  count = var.schedule_interval == 0 ? 0 : 1

  account_id   = random_string.scheduler_service_account_id[0].result
  display_name = "${var.name}-service-account"
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

  name             = "${var.name}-scheduler-job"
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
