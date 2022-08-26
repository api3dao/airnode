///////////////////////////////////////// WARNING /////////////////////////////////////////
//                                                                                       //
//                 Do NOT run these scripts outside a Docker container!                  //
// They modify the environment they run in and therefore may change your local settings. //
//                                                                                       //
///////////////////////////////////////// WARNING /////////////////////////////////////////

import { randomBytes } from 'crypto';
import axios from 'axios';
import yargs from 'yargs';
import { go } from '@api3/promise-utils';
import { logger } from '@api3/airnode-utilities';
import { runCommand, isDocker } from './utils';
import { publishPackages } from './publish-packages';

const NPM_REGISTRY_CONTAINER_IMAGE = 'verdaccio/verdaccio:latest';
const NPM_REGISTRY_CONTIANER_PORT = 4873;

if (!isDocker()) {
  throw new Error('This script should be run only in the Docker container');
}

const runNpmRegistry = async () => {
  const npmRegistryContainerName = `airnode-npm-registry-${randomBytes(4).toString('hex')}`;
  runCommand(`docker run -d --rm --name ${npmRegistryContainerName} ${NPM_REGISTRY_CONTAINER_IMAGE}`);

  const npmRegistryContainerIp = runCommand(
    `docker inspect --format '{{.NetworkSettings.IPAddress}}' ${npmRegistryContainerName}`
  )
    .toString()
    .trim();
  const npmRegistryContainerUrl = `http://${npmRegistryContainerIp}:${NPM_REGISTRY_CONTIANER_PORT}`;

  logger.log(`Running NPM registry container. Name: ${npmRegistryContainerName}, URL: ${npmRegistryContainerUrl}`);

  // Waiting for container to become ready
  const goPing = await go(() => axios.get(npmRegistryContainerUrl), {
    retries: 10,
    delay: { type: 'static', delayMs: 500 },
  });
  if (!goPing.success) {
    stopNpmRegistry(npmRegistryContainerName);
    throw new Error(`Can't connect to the local NPM registry: ${goPing.error}`);
  }

  return {
    npmRegistryContainerName,
    npmRegistryContainerUrl,
  };
};

const stopNpmRegistry = (npmRegistryContainerName: string) => runCommand(`docker stop ${npmRegistryContainerName}`);

const buildContainers = (npmRegistryContainerUrl: string, npmTag: string, dockerTag: string, dev: boolean) => {
  const devSuffix = dev ? '-dev' : '';

  runCommand(
    `docker build --no-cache --build-arg npmRegistryUrl=${npmRegistryContainerUrl} --build-arg npmTag=${npmTag} --tag api3/airnode-admin${devSuffix}:${dockerTag} --file packages/airnode-admin/docker/Dockerfile packages/airnode-admin/docker`
  );
  runCommand(
    `docker build --no-cache --build-arg npmRegistryUrl=${npmRegistryContainerUrl} --build-arg npmTag=${npmTag} --tag api3/airnode-deployer${devSuffix}:${dockerTag} --file packages/airnode-deployer/docker/Dockerfile packages/airnode-deployer/docker`
  );
  runCommand(
    `docker build --no-cache --build-arg npmRegistryUrl=${npmRegistryContainerUrl} --build-arg npmTag=${npmTag} --tag api3/airnode-client${devSuffix}:${dockerTag} --file packages/airnode-node/docker/Dockerfile packages/airnode-node/docker`
  );
};

const prepareContainers = async (npmTag: string, dockerTag: string, dev: boolean) => {
  const { npmRegistryContainerName, npmRegistryContainerUrl } = await runNpmRegistry();
  await publishPackages(npmRegistryContainerUrl, npmTag);
  buildContainers(npmRegistryContainerUrl, npmTag, dockerTag, dev);
  stopNpmRegistry(npmRegistryContainerName);
};

// TODO: CLI will be extended to allow package publication to the official NPM registry and without building a Docker containers
// https://github.com/api3dao/airnode/issues/1332
// https://github.com/api3dao/airnode/issues/1333
const options = yargs(process.argv.slice(2))
  .option('npmTag', {
    default: 'local',
    type: 'string',
    description: 'NPM tag',
  })
  .option('dockerTag', {
    default: 'local',
    type: 'string',
    description: 'Docker tag',
  })
  .option('dev', {
    default: false,
    type: 'boolean',
    description: 'Create development Docker images',
  })
  .strict()
  .wrap(120)
  .parseSync();
logger.log(`CLI options: ${JSON.stringify(options)}`);

prepareContainers(options.npmTag, options.dockerTag, options.dev);
