import { writeFileSync } from 'fs';
import { join } from 'path';
import { Config, LocalOrCloudProvider } from '@api3/airnode-node';
import { cliPrint, getDeployedContract, readChainId, readIntegrationInfo } from '../src';

export const createCloudProviderConfiguration = (generateExampleFile: boolean): LocalOrCloudProvider => {
  if (generateExampleFile) {
    return {
      type: 'local',
    };
  }

  const integrationInfo = readIntegrationInfo();
  const airnodeType = integrationInfo.airnodeType;

  switch (airnodeType) {
    case 'aws':
      return {
        type: airnodeType,
        region: 'us-east-1',
        disableConcurrencyReservations: false,
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
        disableConcurrencyReservations: false,
      };
    }
  }
};

export const getAirnodeRrpAddress = async (generateExampleFile: boolean) => {
  if (generateExampleFile) return '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrp.sol');
  return airnodeRrp.address;
};

export const getChainId = async (generateExampleFile: boolean) =>
  (generateExampleFile ? 31337 : await readChainId()).toString();

export const createNodeVersion = () => {
  return '0.5.0';
};

export const generateConfigFile = (dirname: string, config: Config, generateExampleFile: boolean) => {
  const filename = generateExampleFile ? 'config.example.json' : 'config.json';
  writeFileSync(join(dirname, filename), JSON.stringify(config, null, 2) + '\n');

  cliPrint.info(`A '${filename}' has been created.`);
};
