output "http_gateway_url" {
  value = var.http_api_key == null ? null : "https://${module.httpApiGateway[0].api_url}"
}

output "http_signed_relayed_gateway_url" {
  value = var.http_signed_relayed_api_key == null ? null : "${module.httpSignedRelayedApiGateway[0].api_url}"
}
