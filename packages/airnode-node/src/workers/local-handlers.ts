import * as path from 'path';
import { ethers } from 'ethers';
import { addMetadata, logger, randomHexString, setLogOptions } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { loadTrustedConfig, setEnvValue } from '../config';
import * as handlers from '../handlers';
import * as state from '../providers/state';
import { WorkerResponse, InitializeProviderPayload, CallApiPayload, ProcessTransactionsPayload } from '../types';

export function loadConfig() {
  return loadTrustedConfig(path.resolve(`${__dirname}/../../config/config.json`), process.env);
}
export function setAirnodePrivateKeyToEnv(airnodeWalletMnemonic: string) {
  return setEnvValue('AIRNODE_WALLET_PRIVATE_KEY', ethers.Wallet.fromMnemonic(airnodeWalletMnemonic).privateKey);
}

export async function startCoordinator(): Promise<WorkerResponse> {
  const config = loadConfig();
  const coordinatorId = randomHexString(16);
  setLogOptions({
    format: config.nodeSettings.logFormat,
    level: config.nodeSettings.logLevel,
    meta: { 'Coordinator-ID': coordinatorId },
  });
  setAirnodePrivateKeyToEnv(config.nodeSettings.airnodeWalletMnemonic);

  await handlers.startCoordinator(config, coordinatorId);
  return { ok: true, data: { message: 'Coordinator completed' } };
}

export async function initializeProvider({ state: providerState }: InitializeProviderPayload): Promise<WorkerResponse> {
  const { chainId, name: providerName } = providerState.settings;
  addMetadata({ 'Chain-ID': chainId, Provider: providerName });

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

export async function callApi({ aggregatedApiCall }: CallApiPayload): Promise<WorkerResponse> {
  const { chainId, endpointId } = aggregatedApiCall;
  addMetadata({ 'Chain-ID': chainId, 'Endpoint-ID': endpointId });

  const config = loadConfig();
  setAirnodePrivateKeyToEnv(config.nodeSettings.airnodeWalletMnemonic);
  const [logs, response] = await handlers.callApi(config, aggregatedApiCall);
  logger.logPending(logs);
  return { ok: true, data: response };
}

export async function processTransactions({
  state: providerState,
}: ProcessTransactionsPayload): Promise<WorkerResponse> {
  const { chainId, name: providerName } = providerState.settings;
  addMetadata({ 'Chain-ID': chainId, Provider: providerName, 'Sponsor-Address': providerState.sponsorAddress });

  const config = loadConfig();
  setAirnodePrivateKeyToEnv(config.nodeSettings.airnodeWalletMnemonic);
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
