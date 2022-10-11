import { randomBytes } from 'crypto';
import axios from 'axios';
import { go } from '@api3/promise-utils';
import { logger } from '@api3/airnode-utilities';
import { runCommand } from './utils';

const NPM_REGISTRY_CONTAINER_NAME_PREFIX = 'airnode-npm-registry';
const NPM_REGISTRY_CONTAINER_IMAGE = 'verdaccio/verdaccio:5.15';
const NPM_REGISTRY_CONTAINER_PORT = 4873;

export const getNpmRegistryContainer = () => {
  const containerNames = runCommand(`docker ps --format '{{.Names}}'`).split('\n');
  const npmRegistryContainerName = containerNames.filter((name) =>
    name.startsWith(NPM_REGISTRY_CONTAINER_NAME_PREFIX)
  )[0];

  if (!npmRegistryContainerName) return null;

  const npmRegistryContainerIp = runCommand(
    `docker inspect --format '{{.NetworkSettings.IPAddress}}' ${npmRegistryContainerName}`
  );
  const npmRegistryUrl = `http://${npmRegistryContainerIp}:${NPM_REGISTRY_CONTAINER_PORT}`;

  return {
    npmRegistryContainerName,
    npmRegistryUrl,
  };
};

export const stopNpmRegistry = () => {
  const npmRegistryInfo = getNpmRegistryContainer();
  if (!npmRegistryInfo) {
    throw new Error('No local NPM registry found');
  }

  runCommand(`docker stop ${npmRegistryInfo.npmRegistryContainerName}`);
};

export const startNpmRegistry = async () => {
  const npmRegistryContainerName = `airnode-npm-registry-${randomBytes(4).toString('hex')}`;
  runCommand(`docker run -d --rm --name ${npmRegistryContainerName} ${NPM_REGISTRY_CONTAINER_IMAGE}`);

  const npmRegistryInfo = getNpmRegistryContainer();
  if (!npmRegistryInfo) {
    throw new Error('Starting a local NPM registry failed');
  }

  logger.log(
    `Running NPM registry container. Name: ${npmRegistryInfo.npmRegistryContainerName}, URL: ${npmRegistryInfo.npmRegistryUrl}`
  );

  // Waiting for container to become ready
  const goPing = await go(() => axios.get(npmRegistryInfo.npmRegistryUrl), {
    retries: 10,
    delay: { type: 'static', delayMs: 1500 },
  });
  if (!goPing.success) {
    stopNpmRegistry();
    throw new Error(`Can't connect to the local NPM registry: ${goPing.error}`);
  }

  return npmRegistryInfo;
};
