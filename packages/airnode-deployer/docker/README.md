# Deployer docker image

**This README is intended for the developers. Documentation on how to use the deployer image is in the
[docs](https://docs.api3.org/airnode/latest/grp-providers/docker/deployer-image.html).**

This documentation focuses on the Deployer docker image, not the Deployer itself. If you want to learn more about the
Deployer, please read [its documentation](../README.md).

## Build

In order to build Deployer docker image locally, you need to build the
[artifacts image first](../../../docker/README.md). Once you've done that, you can build the docker image by running the
following command from the root directory:

```bash
yarn docker:build:deployer
```

or invoke the respective docker build command directly.

> If building on windows ensure that the `entrypoint.sh` file uses `LF` line endings. Otherwise the image will not be
> built correctly.

The usage is documented in the [docs](https://docs.api3.org/airnode/latest/grp-providers/docker/deployer-image.html).
