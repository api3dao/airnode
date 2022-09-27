data "google_project" "project" {
}

data "archive_file" "function_zip" {
  type        = "zip"
  output_path = local.tmp_archive
  source_dir  = local.tmp_dir

  depends_on = [local_file.index_js, local_file.gcp_index_js, local_file.config_json]
}
