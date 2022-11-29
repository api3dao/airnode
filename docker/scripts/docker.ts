import { getNpmRegistryContainer } from './npm-registry';
import { runCommand, unifyUrlFormat } from './utils';

const IMAGES = ['airnode-admin', 'airnode-deployer', 'airnode-client'];

export const buildDockerImages = (npmRegistry: string, npmTag: string, dockerTags: string[], dev: boolean) => {
  let npmRegistryUrl = npmRegistry;
  const devSuffix = dev ? '-dev' : '';
  const firstDockerTag = dockerTags[0];

  if (npmRegistry === 'local') {
    const npmRegistryInfo = getNpmRegistryContainer();
    if (!npmRegistryInfo) {
      throw new Error(`Can't build Docker images: No local NPM registry running`);
    }

    npmRegistryUrl = npmRegistryInfo.npmRegistryUrl;
  }

  npmRegistryUrl = unifyUrlFormat(npmRegistryUrl);

  for (const imageName of IMAGES) {
    runCommand(
      `docker build --no-cache --build-arg npmRegistryUrl=${npmRegistryUrl} --build-arg npmTag=${npmTag} --tag api3/${imageName}${devSuffix}:${firstDockerTag} --file /app/${imageName}/Dockerfile /app/${imageName}`
    );

    for (const additionalTag of dockerTags.slice(1)) {
      runCommand(
        `docker tag api3/${imageName}${devSuffix}:${firstDockerTag} api3/${imageName}${devSuffix}:${additionalTag}`
      );
    }
  }
};

const loginDockerHub = () => {
  const username = process.env.DOCKERHUB_USERNAME;
  const password = process.env.DOCKERHUB_TOKEN;

  if (!username || !password) {
    throw new Error('Missing DockerHub credentials');
  }

  runCommand(`docker login --password-stdin --username ${username}`, { input: password });
};

export const publishDockerImages = (dockerTags: string[], dev: boolean) => {
  const devSuffix = dev ? '-dev' : '';

  loginDockerHub();

  for (const imageName of IMAGES) {
    for (const dockerTag of dockerTags) {
      runCommand(`docker push api3/${imageName}${devSuffix}:${dockerTag}`);
    }
  }
};
