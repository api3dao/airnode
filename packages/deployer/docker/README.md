# api3/deployer

**This documentation focuses on the Deployer Docker image and its usage, not the Deployer itself. If you want learn more about the Deployer, please read [its documentation](../README.md).**

## Build
In order to build Deployer Docker image you need to build the [artifacts image first](../../../docker/README.md). Once you've done that, you can build the Docker image by running following command from the root directory:
```bash
docker build -f packages/deployer/docker/Dockerfile -t api3/deployer:latest .
```

## Configuration
### Credentials
In order to deploy Airnode to a cloud provider like AWS, you need to provide your cloud credentials to the container. Airnode currently only supports deploying to [AWS](https://aws.amazon.com/lambda/).

#### AWS
There are two options to provide your AWS credentials to the Docker container

##### Option A: Environment variables:
Create a `aws.env` file with following content and reference it when running Docker
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...
```

```bash
$ docker run --env-file aws.env ...
```

Alternatively, you can provide the environment variables in separately to the Docker command
```bash
docker run -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... ...
```

##### Option B: A configuration file:
You can use a [credential file](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html#cli-configure-files-where) to store toy AWS credentials. Passing this file to the container will allow the Deployer to use these credentials:
```bash
docker run -v ${HOME}/.aws/credentials:/root/.aws/credentials ...
```

### Permissions
By default, the Deployer is run by the user `root`. This may lead to some permission issues since the Deployer provides an output in a form of a `receipt.json` file. To avoid any permission problems, you can specify the [UID (user identifier)](https://en.wikipedia.org/wiki/User_identifier) and [GID (group identifier)](https://en.wikipedia.org/wiki/Group_identifier) that the Deployer should use. You can do that by setting the environment variables `USER_ID` and `GROUP_ID`:
```bash
docker run -e USER_ID=$(id -u) -e GROUP_ID=$(id -g) ...
```

### Volumes
The Deployer needs two configuration files for deployment: `config.json` and `secrets.env`. After a successful deployment has been completed, a `receipt.json` will be created in a new `output/` directory. `receipt.json` must be provided for the removal of a deployed Airnode.

All of these files need to be passed to the Docker container via volumes.

By default, the Docker container looks for configuration files mounted internally in the `/app/config` directory and writes output files to the `/app/output` directory.
```bash
$ tree
.
├── aws.env
├── config
│   ├── config.json
│   └── secrets.env
└── output
$ docker run -v $(pwd)/config:/app/config -v $(pwd)/output:/app/output ...
$ ls output/
receipt.json
```

## Usage
Example directory structure and commands for running the Deployer Docker container. The below commands are run from the depicted directory.

> If you are using Windows, use CMD (and not PowerShell), replace `\` with `^` and `$(pwd)` with `%cd%`.

### Directory structure
```bash
$ tree
.
├── aws.env
├── config
│   ├── config.json
│   └── secrets.env
└── output
```

### Deployment and update
```bash
docker run -it --rm \
  --env-file aws.env \
  -e USER_ID=$(id -u) -e GROUP_ID=$(id -g) \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/output:/app/output \
  api3/deployer:latest deploy
```

### Removal
```bash
docker run -it --rm \
  --env-file aws.env \
  -e USER_ID=$(id -u) -e GROUP_ID=$(id -g) \
  -v $(pwd)/output:/app/output \
  api3/deployer:latest remove -r output/receipt.json
```
