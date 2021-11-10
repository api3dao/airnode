resource "null_resource" "mock_deployment" {
  provisioner "local-exec" {
    command = "echo 'Airnode deployed!'"
  }
}
