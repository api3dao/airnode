import { execSync } from 'child_process';
import { statSync, readFileSync } from 'fs';
import { logger } from '@api3/airnode-utilities';

export const runCommand = (command: string) => {
  logger.log(`Running command: '${command}'`);
  return execSync(command);
};

// Taken from https://github.com/sindresorhus/is-docker

let isDockerCached: boolean | undefined;

const hasDockerEnv = () => {
  try {
    statSync('/.dockerenv');
    return true;
  } catch {
    return false;
  }
};

const hasDockerCGroup = () => {
  try {
    return readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
  } catch {
    return false;
  }
};

export const isDocker = () => {
  if (isDockerCached === undefined) {
    isDockerCached = hasDockerEnv() || hasDockerCGroup();
  }

  return isDockerCached;
};
