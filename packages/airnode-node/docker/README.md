# Airnode client image

**This README is intended for the developers. Documentation on how to use the client image is in the
[docs](https://docs.api3.org/airnode/latest/grp-providers/docker/client-image.html).**

This documentation focuses on the Airnode Docker image, not the Airnode itself. If you want to learn more about Airnode,
please read [its documentation](../README.md).

## Build

In order to build Airnode Docker image you need to build the [artifacts image first](../../../docker/README.md). Once
you've done that, you can build the Docker image by running following command from the root directory:

```bash
yarn docker:build:node
```

or invoke the respective docker build command directly.

> If building on windows ensure that the `airnode-crontab` file uses `LF` line endings. Otherwise the image will not be
> built correctly.

The configuration and usage is documented in the
[docs](https://docs.api3.org/airnode/latest/grp-providers/docker/client-image.html).
