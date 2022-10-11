///////////////////////////////////////// WARNING /////////////////////////////////////////
//                                                                                       //
//                 Do NOT run these scripts outside a Docker container!                  //
// They modify the environment they run in and therefore may change your local settings. //
//                                                                                       //
///////////////////////////////////////// WARNING /////////////////////////////////////////

import { readFileSync, writeFileSync, accessSync, constants } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { go, goSync } from '@api3/promise-utils';
import { logger } from '@api3/airnode-utilities';
import { runCommand, isDocker, unifyUrlFormat } from './utils';
import { getNpmRegistryContainer } from './npm-registry';

const AIRNODE_REPOSITORY = 'https://github.com/api3dao/airnode.git';

if (!isDocker()) {
  throw new Error('This script should be run only in the Docker container');
}

const fetchProject = () => {
  const goAccess = goSync(() => accessSync('/airnode', constants.F_OK));
  if (goAccess.success) {
    runCommand('git config --global --add safe.directory /airnode');
    const excludedFiles = runCommand('git -C /airnode ls-files --exclude-standard -oi --directory').split('\n');
    const excludeOptions = excludedFiles.map((excludedFile) => `--exclude ${excludedFile}`).join(' ');
    runCommand(`rsync -a ${excludeOptions} --exclude .git /airnode/ /build`);
  } else {
    const gitRef = process.env.GIT_REF ?? 'master';
    runCommand(`git clone ${AIRNODE_REPOSITORY} /build`);
    runCommand(`git -C /build checkout ${gitRef}`);
  }
};

const buildProject = () => {
  runCommand('git config --global --add safe.directory /build');
  runCommand('yarn bootstrap', { cwd: '/build' });
  runCommand('yarn build', { cwd: '/build' });
};

const authNpmRegistry = async (npmRegistryUrl: string) => {
  const dummyUser = randomBytes(4).toString('hex');
  const dummyPassword = randomBytes(4).toString('hex');
  const npmrcPath = join(homedir(), '.npmrc');
  const yarnrcPath = join(homedir(), '.yarnrc');

  const goAuthResponse = await go(() =>
    axios.put(
      `${npmRegistryUrl}/-/user/org.couchdb.user:${dummyUser}`,
      {
        name: dummyUser,
        password: dummyPassword,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  );

  if (!goAuthResponse.success) {
    throw new Error(`Can't authenticate against NPM registry ${npmRegistryUrl}: ${goAuthResponse.error}`);
  }

  // It looks like the auth token must be present in the NPM configuration (even when using Yarn) but the
  // registry must be also in the Yarn configuration...
  const newNpmrc = `${npmRegistryUrl.slice(npmRegistryUrl.indexOf(':') + 1)}/:_authToken="${
    goAuthResponse.data.data.token
  }"
registry=${npmRegistryUrl}
`;
  const newYarn = `registry "${npmRegistryUrl}"
`;

  logger.log(`Updated .npmrc: ${newNpmrc}`);
  logger.log(`Updated .yarnrc: ${newYarn}`);

  writeFileSync(npmrcPath, newNpmrc);
  writeFileSync(yarnrcPath, newYarn);
};

// When using changelog type `@changesets/changelog-github` the GitHub token env variable needs to be set.
// This is annoying especially when we want to publish packages only for testing purposes.
// By changing the type to `@changesets/cli/changelog` we can circumvent the issue.
const simplifyChangesetConfig = () => {
  const changesetConfigPath = '/build/.changeset/config.json';
  const oldChangesetConfig = readFileSync(changesetConfigPath, 'utf-8');
  const newChangesetConfig = oldChangesetConfig.replace(
    '"changelog": ["@changesets/changelog-github", { "repo": "api3dao/airnode" }],',
    '"changelog": "@changesets/cli/changelog",'
  );
  writeFileSync(changesetConfigPath, newChangesetConfig);
};

export const publishPackages = async (npmRegistry: string, npmTag: string, _snapshot: boolean) => {
  let npmRegistryUrl = npmRegistry;

  if (npmRegistry === 'local') {
    const npmRegistryInfo = getNpmRegistryContainer();
    if (!npmRegistryInfo) {
      throw new Error(`Can't publish NPM packages: No local NPM registry running`);
    }

    npmRegistryUrl = npmRegistryInfo.npmRegistryUrl;
  }

  npmRegistryUrl = unifyUrlFormat(npmRegistryUrl);

  fetchProject();
  buildProject();
  await authNpmRegistry(npmRegistryUrl);
  simplifyChangesetConfig();
  // Ignoring commands' outputs because of the weird text colorization.
  runCommand(`yarn changeset version --snapshot ${npmTag}`, { cwd: '/build', stdio: 'ignore' });
  runCommand(`yarn changeset publish --no-git-tag --snapshot --tag ${npmTag}`, { cwd: '/build', stdio: 'ignore' });
};
