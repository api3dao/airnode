output "http_gateway_url" {
  value = var.http_api_key == null ? null : "https://${module.httpGw[0].api_url}"
}

output "http_signed_data_gateway_url" {
  value = var.http_signed_data_api_key == null ? null : "https://${module.httpSignedGw[0].api_url}"
}
