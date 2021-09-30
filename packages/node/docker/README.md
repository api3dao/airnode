# api3/airnode

**This documentation focuses on the Airnode Docker image and its usage, not the Airnode itself. If you want learn more about the Airnode, please read [its documentation](../README.md).**

## Build
In order to build Airnode Docker image you need to build the [artifacts image first](../../../docker/README.md). Once you've done that, you can build the Docker image by running following command from the root directory:
```bash
docker build -f packages/node/docker/Dockerfile -t api3/airnode:latest .
```

## Configuration
### Volumes
The Airnode needs two configuration files for its run: `config.json` and `secrets.env`. These files need to be passed to the Docker container via volumes.

The Docker container looks for configuration files mounted internally in the `/app/config` directory.
```bash
$ tree
.
└── config
    ├── config.json
    └── secrets.env
$ docker run -v $(pwd)/config:/app/config ...
```

## Usage
Example directory structure and commands for running the Airnode Docker container. The below commands are run from the depicted directory.

> If you are using Windows, use CMD (and not PowerShell), replace `\` with `^` and `$(pwd)` with `%cd%`.

### Directory structure
```bash
$ tree
.
└── config
    ├── config.json
    └── secrets.env
```

### Running Airnode
```bash
docker run -d \
  -v $(pwd)/config:/app/config \
  --name airnode \
  api3/airnode:latest
```

If you are connected to a local blockchain, you need to make the URL accessible from within the docker itself by using
`--network="host"` parameter.

### Checking Airnode logs
```bash
docker logs airnode
```

## Stopping Airnode
```bash
docker stop airnode
```
