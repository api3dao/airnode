import fs from 'fs';
import { Request } from '@api3/operation';
import { buildChainConfig, buildProvider, getDeployerIndex } from './utils';
import { deployAirnodeRrp, makeRequests } from './deployment';
import { buildConfig, operation } from '../../fixtures';

export const increaseTestTimeout = (timeoutMs = 45_000) => jest.setTimeout(timeoutMs);

export const deployAirnodeAndMakeRequests = async (filename: string, requests?: Request[]) => {
  const deployerIndex = getDeployerIndex(filename);
  const deployConfig = operation.buildDeployConfig(requests ? { deployerIndex, requests } : { deployerIndex });

  const deployment = await deployAirnodeRrp(deployConfig);

  // Overwrites the one injected by the jest setup script
  process.env.MASTER_KEY_MNEMONIC = deployConfig.airnodes.CurrencyConverterAirnode.mnemonic;

  await makeRequests(deployConfig, deployment);

  const chain = buildChainConfig(deployment.contracts);
  const config = buildConfig({ chains: [chain] });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify([config]));

  return { deployment, provider: buildProvider(), config };
};
