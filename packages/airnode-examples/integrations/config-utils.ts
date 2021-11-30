import { writeFileSync } from 'fs';
import { join } from 'path';
import { Config, LocalOrCloudProvider } from '@api3/airnode-node';
import { cliPrint, readIntegrationInfo } from '../src';

export const createCloudProviderConfiguration = (): LocalOrCloudProvider => {
  const integrationInfo = readIntegrationInfo();
  const airnodeType = integrationInfo.airnodeType;

  switch (airnodeType) {
    case 'aws':
      return {
        type: airnodeType,
        region: 'us-east-1',
      };
    case 'local':
      return {
        type: airnodeType,
      };
    case 'gcp': {
      return {
        type: airnodeType,
        region: 'us-east1',
        projectId: integrationInfo.gcpProjectId!,
      };
    }
  }
};

export const createNodeVersion = () => {
  return '0.2.2';
};

export const generateConfigFile = (dirname: string, config: Config, generateExampleFile: boolean) => {
  const filename = generateExampleFile ? 'config.example.json' : 'config.json';
  writeFileSync(join(dirname, filename), JSON.stringify(config, null, 2) + '\n');

  cliPrint.info(`A '${filename}' has been created.`);
};
