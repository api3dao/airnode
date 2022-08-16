///////////////////////////////////////// WARNING /////////////////////////////////////////
//                                                                                       //
//                 Do NOT run these scripts outside a Docker container!                  //
// They modify the environment they run in and therefore may change your local settings. //
//                                                                                       //
///////////////////////////////////////// WARNING /////////////////////////////////////////

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { go } from '@api3/promise-utils';
import { logger } from '@api3/airnode-utilities';
import { runCommand, isDocker } from './utils';

const DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org';

if (!isDocker()) {
  throw new Error('This script should be run only in the Docker container');
}

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
  const changesetConfigPath = join(__dirname, '..', '..', '.changeset', 'config.json');
  const oldChangesetConfig = readFileSync(changesetConfigPath, 'utf-8');
  const newChangesetConfig = oldChangesetConfig.replace(
    '"changelog": ["@changesets/changelog-github", { "repo": "api3dao/airnode" }],',
    '"changelog": "@changesets/cli/changelog",'
  );
  writeFileSync(changesetConfigPath, newChangesetConfig);
};

export const publishPackages = async (npmRegistryUrl: string, npmTag: string) => {
  // Unify the URL format
  npmRegistryUrl = npmRegistryUrl.endsWith('/') ? npmRegistryUrl.slice(0, -1) : npmRegistryUrl;
  // Publishing packages to the official NPM registry is not supported yet.
  if (npmRegistryUrl === DEFAULT_NPM_REGISTRY)
    throw new Error('Publishing packages to the official NPM registry is not supported yet.');

  await authNpmRegistry(npmRegistryUrl);
  simplifyChangesetConfig();
  runCommand(`yarn changeset version --snapshot ${npmTag}`);
  runCommand(`yarn changeset publish --no-git-tag --snapshot --tag ${npmTag}`);
};
