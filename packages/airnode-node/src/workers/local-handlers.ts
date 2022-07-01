import * as path from 'path';
import { ethers } from 'ethers';
import { logger } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { loadTrustedConfig, setEnvValue, Config } from '../config';
import * as handlers from '../handlers';
import * as state from '../providers/state';
import { WorkerResponse, InitializeProviderPayload, CallApiPayload, ProcessTransactionsPayload } from '../types';

function loadConfig() {
  return loadTrustedConfig(path.resolve(`${__dirname}/../../config/config.json`), process.env);
}
function setAirnodePrivateKeyToEnv(config: Config) {
  return setEnvValue(
    'AIRNODE_WALLET_PRIVATE_KEY',
    ethers.Wallet.fromMnemonic(config.nodeSettings.airnodeWalletMnemonic).privateKey
  );
}

export async function startCoordinator(): Promise<WorkerResponse> {
  const config = loadConfig();
  setAirnodePrivateKeyToEnv(config);

  await handlers.startCoordinator(config);
  return { ok: true, data: { message: 'Coordinator completed' } };
}

export async function initializeProvider({ state: providerState }: InitializeProviderPayload): Promise<WorkerResponse> {
  const config = loadConfig();
  const stateWithConfig = state.update(providerState, { config });

  const goInitializedState = await go(() => handlers.initializeProvider(stateWithConfig));
  if (!goInitializedState.success) {
    const msg = `Failed to initialize provider:${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, goInitializedState.error);
    return { ok: false, errorLog };
  }
  if (!goInitializedState.data) {
    const msg = `Failed to initialize provider:${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg);
    return { ok: false, errorLog };
  }

  const scrubbedState = state.scrub(goInitializedState.data);
  return { ok: true, data: scrubbedState };
}

export async function callApi({ aggregatedApiCall, logOptions }: CallApiPayload): Promise<WorkerResponse> {
  const config = loadConfig();
  setAirnodePrivateKeyToEnv(config);
  const [logs, response] = await handlers.callApi({ config, aggregatedApiCall });
  logger.logPending(logs, logOptions);
  return { ok: true, data: response };
}

export async function processTransactions({
  state: providerState,
}: ProcessTransactionsPayload): Promise<WorkerResponse> {
  const config = loadConfig();
  setAirnodePrivateKeyToEnv(config);
  const stateWithConfig = state.update(providerState, { config });

  const goUpdatedState = await go(() => handlers.processTransactions(stateWithConfig));
  if (!goUpdatedState.success) {
    const msg = `Failed to process provider requests:${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, goUpdatedState.error);
    return { ok: false, errorLog };
  }

  const scrubbedState = state.scrub(goUpdatedState.data);
  return { ok: true, data: scrubbedState };
}

export async function processHttpRequest(endpointId: string, parameters: any) {
  const config = loadConfig();
  const [err, result] = await handlers.processHttpRequest(config, endpointId, parameters);
  if (err) {
    throw err;
  }

  return result;
}

export async function processHttpSignedDataRequest(endpointId: string, encodedParameters: any) {
  const config = loadConfig();
  setAirnodePrivateKeyToEnv(config);
  const [err, result] = await handlers.processHttpSignedDataRequest(config, endpointId, encodedParameters);
  if (err) {
    throw err;
  }

  return result;
}
