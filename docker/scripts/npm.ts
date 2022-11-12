///////////////////////////////////////// WARNING /////////////////////////////////////////
//                                                                                       //
//                 Do NOT run these scripts outside a Docker container!                  //
// They modify the environment they run in and therefore may change your local settings. //
//                                                                                       //
///////////////////////////////////////// WARNING /////////////////////////////////////////

import { readFileSync, writeFileSync, accessSync, constants, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { go, goSync } from '@api3/promise-utils';
import { logger } from '@api3/airnode-utilities';
import { runCommand, isDocker, unifyUrlFormat } from './utils';
import { getNpmRegistryContainer } from './npm-registry';
import * as git from './git';
import * as github from './github';

if (!isDocker()) {
  throw new Error('This script should be run only in the Docker container');
}

const fetchProject = () => {
  const goAccess = goSync(() => accessSync('/airnode', constants.F_OK));
  if (goAccess.success) {
    git.config('safe.directory', '/airnode');
    const excludedFiles = git.listFiles({ cwd: '/airnode' }).split('\n');
    const excludeOptions = excludedFiles.map((excludedFile) => `--exclude ${excludedFile}`).join(' ');
    runCommand(`rsync -a ${excludeOptions} --exclude .git /airnode/ /build`);
  } else {
    const gitRef = process.env.GIT_REF ?? 'master';
    git.clone('/build');
    git.checkout(gitRef);
  }
  git.config('safe.directory', '/build');
};

const installDependencies = () => runCommand('yarn bootstrap');

const buildProject = () => runCommand('yarn build');

const registerUser = async (npmRegistryUrl: string) => {
  const dummyUser = randomBytes(4).toString('hex');
  const dummyPassword = randomBytes(4).toString('hex');

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

  return goAuthResponse.data.data.token;
};

const authNpmRegistry = (npmRegistryUrl: string, npmAuthToken: string) => {
  const npmrcPath = join(homedir(), '.npmrc');
  const yarnrcPath = join(homedir(), '.yarnrc');
  // It looks like the auth token must be present in the NPM configuration (even when using Yarn) but the
  // registry must be also in the Yarn configuration...
  const newNpmrc = `${npmRegistryUrl.slice(npmRegistryUrl.indexOf(':') + 1)}/:_authToken="${npmAuthToken}"
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

export const publishSnapshot = async (npmRegistry: string, npmTag: string) => {
  npmTag = `snapshot-${npmTag}`;
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
  installDependencies();
  buildProject();

  let npmAuthToken = process.env.NPM_TOKEN;
  if (npmRegistry === 'local') {
    npmAuthToken = await registerUser(npmRegistryUrl);
  }

  if (!npmAuthToken) {
    throw new Error('Missing NPM authentication token');
  }

  authNpmRegistry(npmRegistryUrl, npmAuthToken);
  simplifyChangesetConfig();
  // Ignoring commands' outputs because of the weird text colorization.
  runCommand(`yarn changeset version --snapshot ${npmTag}`, { stdio: 'ignore' });
  runCommand(`yarn changeset publish --no-git-tag --snapshot --tag ${npmTag}`, { stdio: 'ignore' });
};

const selectBranch = (headBranch: string, baseBranch: string) => {
  if (git.branchExists(headBranch)) {
    git.checkout(headBranch);
  } else {
    git.checkout(baseBranch);
    git.createBranch(headBranch);
  }
};

const applyReleaseChanges = (releaseVersion: string, branch: string) => {
  runCommand(`yarn changeset:new-version`, { stdio: 'ignore' });
  runCommand(`yarn changeset add --empty`, { stdio: 'ignore' });
  git.add();
  git.commit(`Release v${releaseVersion}`);
  git.push(branch);
};

export const openPullRequest = async (releaseVersion: string, headBranch: string, baseBranch: string) => {
  fetchProject();
  installDependencies();

  git.setIdentity('API3 Automation', 'automation@api3.org');
  github.authenticate();
  selectBranch(headBranch, baseBranch);
  applyReleaseChanges(releaseVersion, headBranch);

  const pullRequestTitle = `Release v${releaseVersion}`;
  const pullRequestNumber = await github.createPullRequest(headBranch, baseBranch, pullRequestTitle, '');
  github.requestPullRequestReview(pullRequestNumber);
};

export const publish = async (npmRegistry: string, npmTags: string[], releaseBranch: string) => {
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

  if (!git.branchExists(releaseBranch)) {
    throw new Error(`No '${releaseBranch}' branch found`);
  }
  git.checkout(releaseBranch);

  installDependencies();
  buildProject();

  let npmAuthToken = process.env.NPM_TOKEN;
  if (npmRegistry === 'local') {
    npmAuthToken = await registerUser(npmRegistryUrl);
  }

  if (!npmAuthToken) {
    throw new Error('Missing NPM authentication token');
  }

  authNpmRegistry(npmRegistryUrl, npmAuthToken);

  const firstNpmTag = npmTags[0];
  runCommand(`yarn changeset publish --no-git-tag --tag ${firstNpmTag}`, { stdio: 'ignore' });

  let releaseVersion: string;
  const npmPackages: string[] = readdirSync('packages').map((packageDir) => {
    const packageJson = JSON.parse(readFileSync(`packages/${packageDir}/package.json`).toString());
    releaseVersion = packageJson.version;

    return packageJson.name;
  });

  for (const npmPackage of npmPackages) {
    for (const additionalNpmTag of npmTags.slice(1)) {
      // The library making requests in Yarn is outdated and the `yarn tag add` command fails. Using `npm` instead.
      // https://github.com/yarnpkg/yarn/issues/7823#issuecomment-737248277
      runCommand(`npm dist-tag add ${npmPackage}@${releaseVersion!} ${additionalNpmTag}`);
    }
  }

  git.setIdentity('API3 Automation', 'automation@api3.org');
  github.authenticate();
  const tag = `v${releaseVersion!}`;
  git.tag(tag, `Release ${tag}`);
  git.push(tag);
};
