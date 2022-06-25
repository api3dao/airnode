import { mockReadFileSync } from '../../../test/mock-utils';
import { Request } from '@api3/airnode-operation';
import * as validator from '@api3/airnode-validator';
import { buildChainConfig, buildProvider, getDeployerIndex } from './utils';
import { deployAirnodeRrp, makeRequests } from './deployment';
import { buildConfig, operation } from '../../fixtures';

export const deployAirnodeAndMakeRequests = async (filename: string, requests?: Request[]) => {
  const deployerIndex = getDeployerIndex(filename);
  const deployConfig = operation.buildDeployConfig(requests ? { deployerIndex, requests } : { deployerIndex });
  const deployment = await deployAirnodeRrp(deployConfig);

  await makeRequests(deployConfig, deployment);

  const chain = buildChainConfig(deployment.contracts);
  const config = buildConfig({
    chains: [chain],
  });
  // TODO: This is caused by duplicated mnemonic in Airnode state
  (config.nodeSettings as any).airnodeWalletMnemonic = deployConfig.airnodes.CurrencyConverterAirnode.mnemonic;
  mockReadFileSync('config.json', JSON.stringify(config));
  jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

  return { deployment, provider: buildProvider(), config };
};
