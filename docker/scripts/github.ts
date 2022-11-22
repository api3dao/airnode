import sodium from 'libsodium-wrappers';
import { Octokit } from '@octokit/core';
import { go } from '@api3/promise-utils';
import { logger } from '@api3/airnode-utilities';
import { runCommand } from './utils';

const OWNER = 'api3dao';
const REPOSITORY = 'airnode';
const TEAM = 'airnode';

const initializeOctokit = () => {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error('Missing GitHub token');
  }

  return new Octokit({
    auth: githubToken,
  });
};

const toggleMerge = async (flag: boolean) => {
  logger.log(`Setting 'ENABLE_MERGE' flag to '${flag}' for repository '${OWNER}/${REPOSITORY}'`);

  const octokit = initializeOctokit();

  const goPubKey = await go(() =>
    octokit.request(`GET /repos/${OWNER}/${REPOSITORY}/actions/secrets/public-key`, {
      owner: OWNER,
      repo: REPOSITORY,
    })
  );
  if (!goPubKey.success) {
    throw new Error(`Can't obtain GitHub repository public key: ${goPubKey.error}`);
  }

  const repositoryPublicKey = goPubKey.data.data.key as string;
  const repositoryPublicKeyId = goPubKey.data.data.key_id as string;

  logger.log(`Repository public key: ${repositoryPublicKey} with ID ${repositoryPublicKeyId}`);

  const goSodium = await go(() => sodium.ready);
  if (!goSodium.success) {
    throw new Error(`Can't load the sodium encryption library: ${goSodium.error}`);
  }

  // Convert Secret & Base64 key to Uint8Array.
  const binKey = sodium.from_base64(repositoryPublicKey, sodium.base64_variants.ORIGINAL);
  const binSecret = sodium.from_string(`${flag}`);

  // Encrypt the secret using LibSodium
  const encSecret = sodium.crypto_box_seal(binSecret, binKey);

  // Convert encrypted Uint8Array to Base64
  const base64Secret = sodium.to_base64(encSecret, sodium.base64_variants.ORIGINAL);

  const goSecret = await go(() =>
    octokit.request(`PUT /repos/${OWNER}/${REPOSITORY}/actions/secrets/ENABLE_MERGE`, {
      owner: OWNER,
      repo: REPOSITORY,
      secret_name: 'ENABLE_MERGE',
      encrypted_value: base64Secret,
      key_id: repositoryPublicKeyId,
    })
  );
  if (!goSecret.success) {
    throw new Error(`Can't update GitHub repository secret: ${goSecret.error}`);
  }
};

export const enableMerge = () => toggleMerge(true);
export const disableMerge = () => toggleMerge(false);

export const createPullRequest = async (head: string, base: string, title: string, description: string) => {
  const octokit = initializeOctokit();

  const goPullRequest = await go(() =>
    octokit.request(`POST /repos/${OWNER}/${REPOSITORY}/pulls`, {
      owner: OWNER,
      repo: REPOSITORY,
      title,
      body: description,
      head,
      base,
    })
  );
  if (!goPullRequest.success) {
    throw new Error(`Can't create a GitHub pull-request: ${goPullRequest.error}`);
  }

  return goPullRequest.data.data.number as number;
};

export const requestPullRequestReview = async (pullRequestNumber: number) => {
  const octokit = initializeOctokit();

  const goRequestReview = await go(() =>
    octokit.request(`POST /repos/${OWNER}/${REPOSITORY}/pulls/${pullRequestNumber}/requested_reviewers`, {
      owner: OWNER,
      repo: REPOSITORY,
      pull_number: pullRequestNumber,
      team_reviewers: [TEAM],
    })
  );
  if (!goRequestReview.success) {
    throw new Error(`Can't request a review for GitHub PR ${pullRequestNumber}: ${goRequestReview.error}`);
  }
};

export const authenticate = () => {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error('Missing GitHub token');
  }

  runCommand(`git remote set-url origin https://x-access-token:${githubToken}@github.com/${OWNER}/${REPOSITORY}`);
};
