# api3/airnode-packaging

This is a Docker container for building all the packages in the monorepo, publishing the NPM packages (TODO) and
building the Docker containers.

## How it works

The container uses so called Docker-in-Docker method to build packages and Docker container in the clean Dockerized
environment. The building flow looks like this:

1. The local NPM registry is spun up
2. Packages are built and published in the local NPM registry
3. Docker containers are built, installing the packages from the local NPM registry

## Build

In order to build Airnode packaging image run the following command from the root directory:

```bash
yarn docker:build:packaging
```

Usage of the new Docker Engine integrating BuildKit is highly recommended as it will both decrease the build time and
allow conditional build steps. You can read more about how to enable it in its
[documentation](https://docs.docker.com/develop/develop-images/build_enhancements/).

## Usage

In order for the container to work correctly you need to pass the Docker daemon socket from your system, so the
containers can be used "within" the containers:

```bash
... -v /var/run/docker.sock:/var/run/docker.sock ...
```

If you mount your Airnode directory, the content will be used to build the packages & containers (the content is copied,
there are no changes to your local files):

```bash
... -v $(pwd):/airnode ...
```

If there's no mount to `/airnode`, the content will be retrieved from the GitHub repository. By setting the `GIT_REF`
variable you can specify a Git reference (e.g. branch, commit hash, ...) that should be used:

```bash
... -e GIT_REF=my-dev-branch ...
```

There's a simple CLI via which you can change some build attributes:

- `--dev` - builds the dev Docker images with the `-dev` suffix used in the CI (default: `false`)
- `--npm-tag` - string used as the NPM tag (default: `local`)
- `--docker-tag` - string used as the Docker tag (default: `local`)

```bash
... api3/airnode-packaging:latest --dev --npm-tag 9c218e333a4c27103e64b5b13b1fb53abbcd56c5 --docker-tag 9c218e333a4c27103e64b5b13b1fb53abbcd56c5
```

The whole run command may look something like:

```bash
docker run -it --rm -v $(pwd):/airnode -v /var/run/docker.sock:/var/run/docker.sock api3/airnode-packaging:latest --dev --npm-tag 9c218e333a4c27103e64b5b13b1fb53abbcd56c5 --docker-tag 9c218e333a4c27103e64b5b13b1fb53abbcd56c5
```

You can also use the `build:docker:images` target to build containers from your Airnode directory tagged as `local`.
