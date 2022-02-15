output "http_gateway_url" {
  value = var.http_api_key == null ? null : "https://${module.httpApiGateway[0].api_url}/test"
}
