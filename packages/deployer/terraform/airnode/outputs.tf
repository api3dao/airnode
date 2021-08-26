output "http_gateway_url" {
  value = var.api_key == null ? null : "${module.testApiGateway[0].api_url}/test"
}
