data "google_project" "project" {
}

data "archive_file" "function_zip" {
  type        = "zip"
  output_path = "${local.tmp_output_dir}/${var.name}.zip"
  source_dir  = local.tmp_input_dir

  depends_on = [null_resource.fetch_function_files]
}
