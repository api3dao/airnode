output "http_gateway_url" {
  value = var.http_path_key == null ? null : "${module.httpGw[0].api_url}/${var.http_path_key}"
}

output "http_signed_data_gateway_url" {
  value = var.http_signed_data_path_key == null ? null : "${module.httpSignedGw[0].api_url}/${var.http_signed_data_path_key}"
}
