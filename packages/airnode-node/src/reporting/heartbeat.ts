import { execute } from '@api3/airnode-adapter';
import { logger, PendingLog, go } from '@api3/airnode-utilities';
import { getEnvValue } from '../config';
import { CoordinatorState } from '../types';

export async function reportHeartbeat(state: CoordinatorState): Promise<PendingLog[]> {
  const heartbeat = state.config.nodeSettings.heartbeat;

  if (!heartbeat.enabled) {
    const log = logger.pend('INFO', `Not sending heartbeat as 'nodeSettings.heartbeat' is disabled`);
    return [log];
  }

  const { apiKey, url, id } = heartbeat;
  const httpGatewayUrl = getEnvValue('HTTP_GATEWAY_URL');
  const httpSignedDataGatewayUrl = getEnvValue('HTTP_SIGNED_DATA_GATEWAY_URL');

  const request = {
    url,
    method: 'post' as const,
    headers: {
      'airnode-heartbeat-api-key': apiKey,
    },
    data: {
      deployment_id: id,
      ...(httpGatewayUrl ? { http_gateway_url: httpGatewayUrl } : {}),
      ...(httpSignedDataGatewayUrl ? { http_signed_data_gateway_url: httpSignedDataGatewayUrl } : {}),
    },
    timeout: 5_000,
  };
  const sendingLog = logger.pend('INFO', 'Sending heartbeat...');
  const [err] = await go(() => execute(request));
  if (err) {
    const errLog = logger.pend('ERROR', 'Failed to send heartbeat', err);
    return [sendingLog, errLog];
  }
  const successLog = logger.pend('INFO', 'Heartbeat sent successfully');
  return [sendingLog, successLog];
}
