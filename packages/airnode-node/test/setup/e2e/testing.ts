import { mockReadFileSync } from '../../../test/mock-utils';
import { ethers } from 'ethers';
import { Request } from '@api3/airnode-operation';
import * as validator from '@api3/airnode-validator';
import { buildChainConfig, buildProvider, getDeployerIndex } from './utils';
import { deployAirnodeRrp, makeRequests } from './deployment';
import { setEnvValue } from '../../../src/config';
import { buildConfig, operation, getAirnodeWalletPrivateKey } from '../../fixtures';

// NOTE: This function must be called outside of the test (the "it" callback), but can be called from inside the
// "describe" block. See: https://github.com/facebook/jest/issues/11500#issuecomment-1133428341
export const increaseTestTimeout = (timeoutMs = 120_000) => jest.setTimeout(timeoutMs);

export const deployAirnodeAndMakeRequests = async (filename: string, requests?: Request[]) => {
  const deployerIndex = getDeployerIndex(filename);
  // We need to create a new mnemonic each time otherwise E2E tests
  // will share the same Airnode wallet
  const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
  const deployConfig = operation.buildDeployConfig(
    mnemonic,
    requests ? { deployerIndex, requests } : { deployerIndex }
  );
  // Set the correct private key to environment variables for tests
  setEnvValue('AIRNODE_WALLET_PRIVATE_KEY', getAirnodeWalletPrivateKey(mnemonic));
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

  return { deployment, provider: buildProvider(), config, mnemonic, deployerIndex };
};
