output "http_gateway_url" {
  value = var.http_api_key == null ? null : "${module.httpApiGateway[0].api_url}"
}

output "signed_data_gateway_url" {
  value = var.signed_data_api_key == null ? null : "${module.signedDataApiGateway[0].api_url}"
}
