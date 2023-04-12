# `@api3/airnode-deployer`

> A CLI tool to automate Airnode deployment

## Documentation

You can find documentation on how to use the deployer in the
[deployer docs](https://docs.api3.org/reference/airnode/latest/docker/deployer-image.html).

## For developers

### Build the docker image locally

To build the image follow these [instructions](./docker/README.md).

### Running the deployer CLI from source

Instructions on how to build and use the deployer CLI from source:

1. Install [Terraform](https://www.terraform.io/downloads.html) and make sure that the `terraform` binary is available
   in your `PATH` environment variable. Make sure the version is compatible with the
   [required_version](https://github.com/api3dao/airnode/blob/master/packages/airnode-deployer/terraform/aws/backend.tf#L2)
   of terraform modules used.
2. Prepare necessary cloud credentials. See the
   [instructions in the docs](https://docs.api3.org/reference/airnode/latest/docker/deployer-image.html#cloud-provider-credentials).
3. Make sure `config.json` and `secrets.env` are available in the `config` directory. You can use the provided example
   `config.json` and `secrets.env` templates to get started quickly, but you will need to edit these with your own API
   details and secrets.

```bash
# From this package (/packages/airnode-deployer)
cp config/config.example.json config/config.json
cp config/secrets.example.env config/secrets.env
# Edit both `config.json` and `secrets.env` to reflect your configuration
```

After you prepare the necessary deployment files, there are two options for running the CLI:

1. Run `yarn cli ...`
2. First build the package using `yarn build`, then make the CLI binary executable by running
   `chmod +x ./dist/bin/deployer.js`. Next, use the following, which assumes the default file locations:
   `yarn airnode-deployer deploy -c config/config.json -s config/secrets.env -r config/receipt.json` to deploy or
   redeploy and use `yarn airnode-deployer remove-with-receipt -r config/receipt.json` to remove Airnode.
