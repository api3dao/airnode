import { execSync, ExecSyncOptions } from 'child_process';
import { statSync, readFileSync, accessSync, constants } from 'fs';
import omit from 'lodash/omit';
import { logger } from '@api3/airnode-utilities';
import { goSync } from '@api3/promise-utils';

export const runCommand = (command: string, options?: ExecSyncOptions) => {
  // Omitting `input` as it's used for passing the DockerHub password and we don't want to log it
  logger.log(
    `Running command: '${command}'${options ? ` with options ${JSON.stringify(omit(options, ['input']))}` : ''}`
  );
  try {
    return execSync(command, options)?.toString().trim();
  } catch (e) {
    // Thrown Error object contains the entire result from child_process.spawnSync()
    const err = e as any;
    throw new Error(
      [
        ``,
        `Command failed with non-zero status code: ${err.status}`,
        `Stderr: ${err.stderr.toString().trim()}.`,
        `Stdout: ${err.stdout.toString().trim()}.`,
      ].join('\n')
    );
  }
};

export const unifyUrlFormat = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);

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

// If the `/airnode` directory is mounted it means that we're using the local Airnode source code.
// This is useful (and used) only for the `npm publish-snapshot` command and the CI.
// The mounted directory will be IGNORED by all other commands.
export const isAirnodeMounted = () => goSync(() => accessSync('/airnode', constants.F_OK)).success;
