import { ExecSyncOptions } from 'child_process';
import { isDocker, runCommand } from './utils';

const AIRNODE_REPOSITORY = 'https://github.com/api3dao/airnode.git';

if (!isDocker()) {
  throw new Error('This script should be run only in the Docker container');
}

export const config = (section: string, value: string) => runCommand(`git config --global --add ${section} '${value}'`);

export const clone = (directory?: string) => runCommand(`git clone ${AIRNODE_REPOSITORY} ${directory ?? ''}`);

export const checkout = (ref: string, options?: ExecSyncOptions) => {
  runCommand(`git checkout ${ref}`, options);
};

export const listFiles = (options?: ExecSyncOptions) =>
  runCommand(`git ls-files --exclude-standard -oi --directory`, options);

export const add = (options?: ExecSyncOptions) => runCommand('git add .', options);

export const commit = (message: string, options?: ExecSyncOptions) => {
  runCommand(`git commit --no-verify -m '${message}'`, options);
};

export const push = (branch: string, options?: ExecSyncOptions) => {
  if (branch === 'master') {
    throw new Error(`No pushing to 'master' branch`);
  }

  runCommand(`git push origin ${branch}`, options);
};

export const branchExists = (branch: string, options?: ExecSyncOptions) => {
  const foundRemoteBranches = runCommand(`git ls-remote --heads origin ${branch}`, options);
  return !!foundRemoteBranches;
};

export const createBranch = (branch: string, options?: ExecSyncOptions) => {
  runCommand(`git checkout -b ${branch}`, options);
};

export const setIdentity = (name: string, email: string) => {
  config('user.name', name);
  config('user.email', email);
};

export const tag = (tag: string, message: string, options?: ExecSyncOptions) => {
  runCommand(`git tag -a ${tag} -m '${message}'`, options);
};
