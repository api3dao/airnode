import { execSync } from 'child_process';
import { logger } from '../logging';

export const getCommitHash = () => execSync('git rev-parse HEAD').toString().trim();

export const getTag = () => {
  const commitHash = getCommitHash();

  const tagAndHash = execSync(`git show-ref --tags`)
    .toString()
    .trim()
    .split(`\n`)
    .find((line) => line.indexOf(commitHash) !== -1);

  if (!tagAndHash) {
    return undefined;
  }

  try {
    return tagAndHash.split(' ')[1].split('@')[2];
  } catch (e) {
    logger.error((e as Error).message);
  }

  return undefined;
};

export const isStagingClean = () => execSync('git status').toString().trim().indexOf('Changes to be committed') === -1;
