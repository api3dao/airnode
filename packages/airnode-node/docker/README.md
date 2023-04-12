# Airnode Docker image

**This README is intended for the developers. Documentation on how to use the client image is in the
[docs](https://docs.api3.org/reference/airnode/latest/docker/client-image.html).**

This documentation focuses on the Airnode Docker image, not the Airnode itself. If you want to learn more about Airnode,
please read [its documentation](../README.md).

## Build

In order to build Airnode Docker image run the following command from the root directory:

```bash
yarn docker:build:local
```

> If building on windows ensure that the `airnode-crontab` and `entrypoint.sh` files use `LF` line endings. Otherwise
> the image will not be built correctly.

The configuration and usage is documented in the
[docs](https://docs.api3.org/reference/airnode/latest/docker/client-image.html).
