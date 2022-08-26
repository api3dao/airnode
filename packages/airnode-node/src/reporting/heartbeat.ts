import { ethers } from 'ethers';
import { execute } from '@api3/airnode-adapter';
import { logger, PendingLog } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { Config, getEnvValue } from '../config';
import { CoordinatorState } from '../types';
import { getGatewaysUrl, HTTP_BASE_PATH, HTTP_SIGNED_DATA_BASE_PATH } from '../workers/local-gateways/server';
import { getAirnodeWalletFromPrivateKey } from '../evm';
import { HEARTBEAT_SALT } from '../constants';

export function getHttpGatewayUrl(config: Config) {
  if (config.nodeSettings.cloudProvider.type === 'local') {
    return getGatewaysUrl(config.nodeSettings.cloudProvider.gatewayServerPort, HTTP_BASE_PATH);
  }

  return getEnvValue('HTTP_GATEWAY_URL');
}

export function getHttpSignedDataGatewayUrl(config: Config) {
  if (config.nodeSettings.cloudProvider.type === 'local') {
    return getGatewaysUrl(config.nodeSettings.cloudProvider.gatewayServerPort, HTTP_SIGNED_DATA_BASE_PATH);
  }
  return getEnvValue('HTTP_SIGNED_DATA_GATEWAY_URL');
}

export const signHeartbeat = async (heartbeatPayload: Record<string, string>) => {
  const airnodeWallet = getAirnodeWalletFromPrivateKey();

  return await airnodeWallet.signMessage(
    ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(['string', 'string'], [HEARTBEAT_SALT, JSON.stringify(heartbeatPayload)])
    )
  );
};

export async function reportHeartbeat(state: CoordinatorState): Promise<PendingLog[]> {
  const heartbeat = state.config.nodeSettings.heartbeat;

  if (!heartbeat.enabled) {
    const log = logger.pend('INFO', `Not sending heartbeat as 'nodeSettings.heartbeat' is disabled`);
    return [log];
  }

  const { apiKey, url } = heartbeat;
  const httpGatewayUrl = getHttpGatewayUrl(state.config);
  const httpSignedDataGatewayUrl = getHttpSignedDataGatewayUrl(state.config);

  const heartbeatPayload = {
    ...(httpGatewayUrl ? { http_gateway_url: httpGatewayUrl } : {}),
    ...(httpSignedDataGatewayUrl ? { http_signed_data_gateway_url: httpSignedDataGatewayUrl } : {}),
  };

  const goSignHeartbeat = await go(() => signHeartbeat(heartbeatPayload));
  if (!goSignHeartbeat.success) {
    const log = logger.pend('ERROR', 'Failed to sign heartbeat', goSignHeartbeat.error);
    return [log];
  }

  const request = {
    url,
    method: 'post' as const,
    headers: {
      'airnode-heartbeat-api-key': apiKey,
    },
    data: {
      ...heartbeatPayload,
      signature: goSignHeartbeat.data,
    },
    timeout: 5_000,
  };
  const sendingLog = logger.pend('INFO', 'Sending heartbeat...');
  const goRes = await go(() => execute(request));
  if (!goRes.success) {
    const errLog = logger.pend('ERROR', 'Failed to send heartbeat', goRes.error);
    return [sendingLog, errLog];
  }
  const successLog = logger.pend('INFO', 'Heartbeat sent successfully');
  return [sendingLog, successLog];
}
