resource "google_storage_bucket" "tfstate_bucket" {
  name                        = "${var.infrastructure_name}-${var.airnode_address_short}-${var.stage}-terraform"
  storage_class               = "STANDARD"
  location                    = var.gcp_region
  force_destroy               = true
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}
