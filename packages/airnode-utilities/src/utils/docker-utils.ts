import { execSync } from 'child_process';
import { logger } from '../logging';
import { gitUtils } from '../index';

export const imageAvailableOnDockerHub = (imagePath: string) =>
  execSync(`docker manifest inspect ${imagePath} > /dev/null ; echo $?`).toString().trim().indexOf('0') > -1;

type imageNames = 'deployer' | 'admin' | 'client' | 'artifacts';

export const getDockerImage = (imageName: imageNames) => {
  const commitHash = process.env.COMMIT ?? gitUtils.getCommitHash();

  if (process.env.COMMIT) {
    return `api3/airnode-${imageName}-dev:${commitHash}`;
  }

  const tag = gitUtils.getTag();

  if (gitUtils.isStagingClean()) {
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
