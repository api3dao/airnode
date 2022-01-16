# @api3/airnode-deployer

> Airnode deployment CLI and its docker image

## User documentation

You can find documentation on how to use the deployer in the
[deployer docs](https://docs.api3.org/airnode/latest/grp-providers/docker/deployer-image.html).

## For developers

The rest of the README contains instructions on how to build and use the deployer CLI. However, the intended way to run
the deployer for users is using the [deployer docker image](./docker/README.md).

### Prerequisites

- Install [Terraform v0.15.x](https://www.terraform.io/downloads.html) and make sure that the `terraform` binary is
  available in your `PATH`
- AWS deployment - Make sure your AWS credentials are stored in the
  [configuration file](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html#cli-configure-files-where)
  or exported as
  [environment variables](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html#envvars-set). If
  you need help setting up an AWS IAM user you can follow
  [this video tutorial](https://www.youtube.com/watch?v=bT19B3IBWHE).
- GCP deployment
  - Create a [Google Cloud project](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
  - Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and obtain your
    [Application Default Credentials](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login)
  - Enable [CloudFunction API](https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com),
    [Cloud Build API](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com) and
    [Cloud Scheduler API](https://console.cloud.google.com/apis/library/cloudscheduler.googleapis.com) for your project

### Setup

- Build all the Airnode packages

```bash
# Run from the root
yarn build
```

- Make sure `config.json` and `secrets.env` are available in the `config` directory. You can use the provided example
  `config.json` and `secrets.env` templates to get started quickly, but you will need to edit these with your own API
  details and secrets.

```bash
# From this package (/packages/airnode-deployer)
cp config/config.json.example config/config.json
cp config/secrets.env.example config/secrets.env
# Edit both `config.json` and `secrets.env` to reflect your configuration
```

### Common user flow

1. Make sure you have `config.json` and `secrets.env` ready. Then, use the `deploy` command to trigger your first
   deployment.
2. In order to update the Airnode configuration:
   - Update the `config.json` file
   - Run the `deploy` command again
3. Use the `remove` command to remove the Airnode deployment. Use the `-r` option to provide the receipt file from the
   latest deployment.

### Commands

#### deploy

```bash
Deploys an Airnode instance using the `config.json` and `secrets.env` files. This can be used for a new deployment or to update an existing deployment.

Options:
      --version                          Show version number                                                   [boolean]
      --debug                            Run in debug mode                                    [boolean] [default: false]
      --help                             Show help                                                             [boolean]
  -c, --configuration, --config, --conf  Path to configuration file             [string] [default: "config/config.json"]
  -s, --secrets                          Path to secrets file                   [string] [default: "config/secrets.env"]
  -r, --receipt                          Output path for receipt file          [string] [default: "output/receipt.json"]
```

#### remove

```bash
Removes a deployed Airnode instance

Options:
      --version                Show version number                                                             [boolean]
      --debug                  Run in debug mode                                              [boolean] [default: false]
      --help                   Show help                                                                       [boolean]
  -r, --receipt                Path to receipt file                                                             [string]
  -a, --airnode-address-short  Airnode Address (short version)                                                  [string]
  -s, --stage                  Stage (environment)                                                              [string]
  -c, --cloud-provider         Cloud provider                                                    [choices: "aws", "gcp"]
  -e, --region                 Region                                                                           [string]
  -p, --project-id             Project ID (GCP only)                                                            [string]
```
