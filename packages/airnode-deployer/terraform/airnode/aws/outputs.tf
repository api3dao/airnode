output "http_gateway_url" {
  value = var.http_gateway_enabled == false ? null : "${module.httpGw[0].api_url}/${random_uuid.http_path_key.result}"
}

output "http_signed_data_gateway_url" {
  value = var.http_signed_data_gateway_enabled == false ? null : "${module.httpSignedGw[0].api_url}/${random_uuid.http_signed_data_path_key.result}"
}
