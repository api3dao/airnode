import { getNpmRegistryContainer } from './npm-registry';
import { runCommand, unifyUrlFormat } from './utils';

export const buildDockerImages = (npmRegistry: string, npmTag: string, dockerTag: string, dev: boolean) => {
  let npmRegistryUrl = npmRegistry;
  const devSuffix = dev ? '-dev' : '';

  if (npmRegistry === 'local') {
    const npmRegistryInfo = getNpmRegistryContainer();
    if (!npmRegistryInfo) {
      throw new Error(`Can't build Docker images: No local NPM registry running`);
    }

    npmRegistryUrl = npmRegistryInfo.npmRegistryUrl;
  }

  npmRegistryUrl = unifyUrlFormat(npmRegistryUrl);

  runCommand(
    `docker build --no-cache --build-arg npmRegistryUrl=${npmRegistryUrl} --build-arg npmTag=${npmTag} --tag api3/airnode-admin${devSuffix}:${dockerTag} --file /app/airnode-admin/Dockerfile /app/airnode-admin`
  );
  runCommand(
    `docker build --no-cache --build-arg npmRegistryUrl=${npmRegistryUrl} --build-arg npmTag=${npmTag} --tag api3/airnode-deployer${devSuffix}:${dockerTag} --file /app/airnode-deployer/Dockerfile /app/airnode-deployer`
  );
  runCommand(
    `docker build --no-cache --build-arg npmRegistryUrl=${npmRegistryUrl} --build-arg npmTag=${npmTag} --tag api3/airnode-client${devSuffix}:${dockerTag} --file /app/airnode-client/Dockerfile /app/airnode-client`
  );
};
