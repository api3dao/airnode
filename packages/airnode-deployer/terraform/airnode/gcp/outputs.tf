output "http_gateway_url" {
  value = var.api_key == null ? null : "https://${module.apiGateway[0].api_url}/test"
}
