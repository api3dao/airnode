# @airnode/deploy

> The deployment tools for Airnode

## Instructions

- Download the [Terraform v0.13.* binary](https://www.terraform.io/downloads.html) and move it to your `PATH`
- Get an *Access Key ID* and *Secret Access Key* from AWS and insert into `terraform/sensitive.auto.tfvars`
- Install Serverless Framework globally
```sh
npm install -g serverless
```

## Private key handling

-  If `nodeSettings.providerId` exists in `config.json`
    - If `security.masterKeyMnemonic` exists in `security.json`
      - Verify that the provider ID and the mnemonic are consistent, throw if they are not
      - If the private key does not exist on SSM, create it
    - else
      - Throw if the private key does not exist on SSM
- else
    - If `security.masterKeyMnemonic` exists in `security.json`
      - Derive the provider ID from the mnemonic
      - If the private key does not exist on SSM, create it
    - else
      - Generate a random mnemonic
      - Derive the provider ID from the mnemonic
      - Create the private key on SSM
