import fs from 'fs';
import { Request } from '@api3/airnode-operation';
import * as validator from '@api3/airnode-validator';
import { buildChainConfig, buildProvider, getDeployerIndex } from './utils';
import { deployAirnodeRrp, makeRequests } from './deployment';
import { buildConfig, operation } from '../../fixtures';

export const increaseTestTimeout = (timeoutMs = 120_000) => jest.setTimeout(timeoutMs);

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
  // @ts-ignore
  // eslint-disable-next-line functional/immutable-data
  config.nodeSettings.airnodeWalletMnemonic = deployConfig.airnodes.CurrencyConverterAirnode.mnemonic;
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
  jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [] });

  return { deployment, provider: buildProvider(), config };
};
