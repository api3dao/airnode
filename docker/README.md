# api3/artifacts

This is a Docker container for building all the packages in the monorepo and providing their build artifacts. Other
package specific containers can use this one to obtain files necessary for their run without building or installing any
additional dependencies.

## Build

Builds need to be run from the root directory to build the necessary context.

Usage of the new Docker Engine integrating BuildKit is highly recommended as it will both decrease the build time and
allow conditional build steps. You can read more about how to enable it in its
[documentation](https://docs.docker.com/develop/develop-images/build_enhancements/).

### Local

You can build the container image from your current workspace by providing a build type `local` (this is the default)

```bash
docker build --build-arg build=local -f docker/Dockerfile -t api3/artifacts:latest .
# or with no build argument
```

### Git

You can build the container image from the Git repository and you can also provide a branch, tag or commit from which
the build should be done

```bash
docker build --build-arg build=git --build-arg branch=my-branch -f docker/Dockerfile -t api3/artifacts:latest .
# the default branch is master
```

## Usage

Artifacts Docker image is not suitable for a direct usage. It's a building step for other containers.

Once built the image contains 3 directories with artifacts that can be used for building other images:

- `/build` - contains copy of the monorepo with all the packages build, including all the dev dependencies
- `/packages` - contains directories representing unpacked packages of all the packages in the monorepo
- `/dependencies` - contains runtime dependencies for all the packages in the monorepo (content of the main
  `node_modules` directory) excluding the packages from the monorepo themselves

### Dockerfile example

```Docker
COPY --from=api3/artifacts /dependencies ${appDir}/node_modules
COPY --from=api3/artifacts /packages ${appDir}/node_modules/@api3/
COPY --from=api3/artifacts /build/packages/airnode-deployer/dist ${appDir}/
```
