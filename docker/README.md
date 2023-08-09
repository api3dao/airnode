# api3/airnode-packaging

This is a Docker container that can:

- Enable/disable GitHub pull-request merging
- Start/stop a local NPM registry Docker container
- Build and publish NPM packages to both local and official NPM registry
- Build and publish Docker containers from both local and official NPM packages

The container uses so called Docker-in-Docker method to build packages and Docker container in the clean Dockerized
environment.

## Build

In order to build Airnode packaging image run the following command from the root directory:

```bash
yarn docker:build:packaging
```

Usage of the new Docker Engine integrating BuildKit is highly recommended as it will both decrease the build time and
allow conditional build steps. You can read more about how to enable it in its
[documentation](https://docs.docker.com/develop/develop-images/build_enhancements/).

## Usage

There are four CLI commands available:

- [`github`](#github)
- [`npm-registry`](#npm-registry)
- [`npm`](#npm)
- [`docker`](#docker)

**To build Docker images, you can use the two convenience Yarn targets:**

```bash
yarn docker:build:local
yarn docker:build:latest
```

### github

```
Manages GitHub PR merging

Commands:
  index.js github enable-merge   Enables PR merging
  index.js github disable-merge  Disables PR merging
```

You can enable and disable GitHub pull-request merging. Disabling merging is useful during the release process so the
`master` branch won't move until the packages are released.

You need to provide `GITHUB_TOKEN` environment variable containing GitHub authentication token.

Example:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -e GITHUB_TOKEN api3/airnode-packaging:latest github enable-merge
```

You can use two convenience Yarn targets for enabling and disabling PR merging:

```bash
yarn docker:scripts:github:enable-merge
yarn docker:scripts:github:disable-merge
```

### npm-registry

```
Manages the local NPM registry

Commands:
  index.js npm-registry start  Start the local NPM registry
  index.js npm-registry stop   Stop the local NPM registry                                                                                       [boolean]
```

You can start and stop a local NPM registry. Can be useful for manual package testing but it's mostly a step needed for
the rest of the functionality.

Example:

```bash
docker run -it --rm -v /var/run/docker.sock:/var/run/docker.sock api3/airnode-packaging:latest npm-registry start
```

You can use two convenience Yarn targets for starting and stopping the container:

```bash
yarn docker:scripts:npm-registry:start
yarn docker:scripts:npm-registry:stop
```

### npm

**publish-snapshot**

```
Publish snapshot NPM packages

Options:
      --version         Show version number                                                                    [boolean]
      --help            Show help                                                                              [boolean]
  -r, --npm-registry    NPM registry URL to publish to or a keyword `local` to use a local NPM registry
                                                                       [string] [default: "https://registry.npmjs.org/"]
  -t, --npm-tag         NPM tag to publish the packages under                               [string] [default: "latest"]
  -b, --release-branch  Branch, from which are the packages released                                            [string]
```

You can build and publish
[**snapshot** NPM packages](https://github.com/changesets/changesets/blob/main/docs/snapshot-releases.md).

Use the `--npm-registry` option to specify the registry where the packages should be uploaded to. When the keyword
`local` is used instead of the URL, the local NPM (see [`npm-registry`](#npm-registry)) will be used.

Use the `--npm-tag` option to specify the tag for the published packages.

Use the `--release-branch` option to specify the Git branch from which the code for packages should be used.

When publishing to the official NPM registry you have to provide `NPM_TOKEN` environment variable containing NPM
registry authentication token.

\*You can mount the Airnode directory into the container's `/airnode` in order to use your local changes. **This is for
development only and shouldn't be used for proper snapshot packages.\***

Example:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock api3/airnode-packaging:latest npm publish-snapshot --npm-tag v0.11.0 --release-branch v0.11
```

You can use two convenience Yarn targets to publish snapshot packages to a local or official NPM registry:

```bash
yarn docker:scripts:npm:publish-snapshot:local
yarn docker:scripts:npm:publish-snapshot:official
```

**pull-request**

```
Create a release GitHub pull-request

Options:
      --version          Show version number                                                                   [boolean]
      --help             Show help                                                                             [boolean]
  -v, --release-version  Release version for which should be the pull-request opened                 [string] [required]
  -h, --head-branch      Branch from which should be the pull-request opened                         [string] [required]
  -b, --base-branch      Branch against which should be the pull-request opened                      [string] [required]
```

You can open a GitHub pull-request for a given release.

Use the `--release-version` option to specify the version of the release this pull-request should be for.

Use the `--head-branch` option to specify the branch from which should be the pull-request opened.

Use the `--base-branch` option to specify the branch against which should be the pull-request opened.

You have to provide `GITHUB_TOKEN` environment variable containing GitHub authentication token.

Example:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock api3/airnode-packaging:latest npm pull-request --release-version 0.11.0 --head-branch v0.11 --base-branch master
```

You can use the convenience Yarn target to create a release pull-request. You still need to provide appropriate options.

```bash
yarn docker:scripts:npm:pull-request
```

**publish**

```
Publish NPM package from the release branch

Options:
      --version         Show version number                                                                    [boolean]
      --help            Show help                                                                              [boolean]
  -r, --npm-registry    NPM registry URL to publish to or a keyword `local` to use a local NPM registry
                                                                       [string] [default: "https://registry.npmjs.org/"]
  -t, --npm-tags        NPM tags to publish the packages under                             [array] [default: ["latest"]]
  -b, --release-branch  Branch, from which are the packages released                                 [string] [required]
```

You can build and publish **official** NPM packages.

Use the `--npm-registry` option to specify the registry where the packages should be uploaded to. When the keyword
`local` is used instead of the URL, the local NPM (see [`npm-registry`](#npm-registry)) will be used.

Use the `--npm-tags` option to specify the tags for the published packages.

Use the `--release-branch` option to specify the Git branch from which the code for packages should be used.

When publishing to the official NPM registry you have to provide `NPM_TOKEN` environment variable containing NPM
registry authentication token.

Example:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock api3/airnode-packaging:latest npm publish --npm-tags latest v0.11 --release-branch v0.11
```

You can use the convenience Yarn target to publish the NPM packages. You still need to provide appropriate options.

```bash
yarn docker:scripts:npm:publish
```

### docker

**build**

```
Build Docker images

Options:
      --version       Show version number                                                                      [boolean]
      --help          Show help                                                                                [boolean]
  -r, --npm-registry  NPM registry URL to fetch packages from or a keyword `local` to use a local NPM registry
                                                                       [string] [default: "https://registry.npmjs.org/"]
  -t, --npm-tag       NPM tag/version of the packages that will be fetched                  [string] [default: "latest"]
  -g, --docker-tags   Docker tags to build the images under                                [array] [default: ["latest"]]
  -d, --dev           Build Docker dev images (with -dev suffix)                              [boolean] [default: false]
```

You can build Airnode Docker images.

Use the `--npm-registry` option to specify the registry from which the NPM packages should be installed during the
building process. When the keyword `local` is used instead of the URL, the local NPM (see
[`npm-registry`](#npm-registry)) will be used.

Use the `--npm-tag` option to specify the tag of the NPM package that should be installed during the building process.

Use the `--docker-tags` option to specify the Docker tags the resulting images will be tagged as.

Use the `--dev` option to build the development images, with the `-dev` suffix in their name.

Example:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock api3/airnode-packaging:latest docker build --npm-registry local --npm-tag local --docker-tags local
```

You can use two convenience Yarn targets for building Docker images from the local NPM packages and from the latest
official ones:

```bash
yarn docker:scripts:docker:build:local
yarn docker:scripts:docker:build:latest
```

**publish**

```
Publish Docker images

Options:
      --version      Show version number                                                                       [boolean]
      --help         Show help                                                                                 [boolean]
  -g, --docker-tags  Docker tags to publish                                                [array] [default: ["latest"]]
  -d, --dev          Publish Docker dev images (with -dev suffix)                             [boolean] [default: false]
```

You can publish (push) Airnode Docker images.

Use the `--docker-tags` option to specify the Docker tags of the images that should be pushed.

Use the `--dev` option to push the images, with the `-dev` suffix in their name.

You need to provide two environment variables to authenticate against the DockerHub registry:

- `DOCKERHUB_USERNAME` - DockerHub username
- `DOCKERHUB_TOKEN` - DockerHub access token

Example:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -e DOCKERHUB_USERNAME -e DOCKERHUB_TOKEN api3/airnode-packaging:latest docker publish
```

You can use a convenience Yarn target for publishing the latest Docker images:

```bash
docker:scripts:docker:publish:latest
```
