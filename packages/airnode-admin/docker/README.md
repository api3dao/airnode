# Airnode admin CLI docker image

**This README is intended for the developers. Documentation on how to use the admin CLI docker image is in the
[docs](TODO:).**

This documentation focuses on the admin CLI docker image, not the admin CLI itself. If you want to learn more about the
admin CLI, please read [its documentation](../README.md).

## Build

In order to build Airnode Docker image you need to build the [artifacts image first](../../../docker/README.md). Once
you've done that, you can build the Docker image by running following command from the root directory:

```bash
docker build -f packages/airnode-admin/docker/Dockerfile -t api3/airnode-admin:latest .
```
