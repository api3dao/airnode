# Airnode deployer Docker image

**This README is intended for the developers. Documentation on how to use the deployer image is in the
[docs](https://docs.api3.org/reference/airnode/latest/docker/deployer-image.html).**

This documentation focuses on the Airnode deployer Docker image, not the Airnode deployer itself. If you want to learn
more about the Deployer, please read [its documentation](../README.md).

## Build

In order to build Airnode deployer Docker image run the following command from the root directory:

```bash
yarn docker:build:local
```

> If building on windows ensure that the `entrypoint.sh` file uses `LF` line endings. Otherwise the image will not be
> built correctly.

The usage is documented in the [docs](https://docs.api3.org/reference/airnode/latest/docker/deployer-image.html).
