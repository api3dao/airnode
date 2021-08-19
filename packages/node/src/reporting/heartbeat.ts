import { execute } from '@api3/adapter';
import { getEnvValue } from '../config';
import * as logger from '../logger';
import { go } from '../utils';
import { CoordinatorState, PendingLog } from '../types';

export async function reportHeartbeat(state: CoordinatorState): Promise<PendingLog[]> {
  if (!state.config.nodeSettings.enableHeartbeat) {
    const log = logger.pend('INFO', `Not sending heartbeat as 'nodeSettings.enableHeartbeat' is disabled`);
    return [log];
  }

  const apiKey = getEnvValue('HEARTBEAT_API_KEY');
  const url = getEnvValue('HEARTBEAT_URL');
  const heartbeatId = getEnvValue('HEARTBEAT_ID');
  if (!apiKey || !url || !heartbeatId) {
    const log = logger.pend('WARN', 'Unable to send heartbeat as HEARTBEAT_ environment variables are missing');
    return [log];
  }

  const httpGatewayUrl = getEnvValue('HTTP_GATEWAY_URL');

  // TODO: add statistics here
  const payload = {};

  const request = {
    url,
    method: 'post' as const,
    data: {
      api_key: apiKey,
      deployment_id: heartbeatId,
      ...(httpGatewayUrl ? {} : { http_gateway_url: httpGatewayUrl }),
      payload,
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
