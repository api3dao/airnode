# Airnode admin CLI docker image

**This README is intended for the developers. Documentation on how to use the airnode-admin image is in the
[docs](https://docs.api3.org/airnode/latest/grp-providers/docker/admin-cli-image.html).**

This documentation focuses on the admin CLI docker image, not the admin CLI itself. If you want to learn more about the
admin CLI, please read [its documentation](../README.md).

## Build

In order to build Airnode Docker image you need to build the [artifacts image first](../../../docker/README.md). Once
you've done that, you can build the Docker image by running following command from the root directory:

```bash
yarn docker:build:admin
```

or invoke the respective docker build command directly.
