import { execSync } from 'child_process';
import { getTag, getCommitHash, isStagingClean } from './git';
import { logger } from '../logging';

export const imageAvailableOnDockerHub = (imagePath: string) =>
  execSync(`docker manifest inspect ${imagePath} > /dev/null ; echo $?`).toString().trim().indexOf('0') > -1;

type imageNames = 'deployer' | 'admin' | 'client' | 'artifacts';

export const getDockerImage = (imageName: imageNames) => {
  const commitHash = process.env.COMMIT ?? getCommitHash();

  if (process.env.COMMIT) {
    return `api3/airnode-${imageName}-dev:${commitHash}`;
  }

  const tag = getTag();

  if (isStagingClean()) {
    if (tag && imageAvailableOnDockerHub(`api3/airnode-${imageName}:${tag}`)) {
      logger.log(`Tagged image available from Docker Hub: ${tag}`);
      return `api3/airnode-${imageName}:${tag}`;
    }

    if (imageAvailableOnDockerHub(`api3/airnode-${imageName}-dev:${commitHash}`)) {
      logger.log(`A pre-built image is available from Docker Hub.`);
      return `api3/airnode-${imageName}-dev:${commitHash}`;
    }
  }

  return `api3/airnode-${imageName}:latest`;
};
