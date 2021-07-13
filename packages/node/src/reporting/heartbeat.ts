import { execute } from '@api3/adapter';
import { getEnvValue } from '../config';
import { CoordinatorState } from '../types';

export async function reportHeartbeat(state: CoordinatorState) {
  if (!state.config.nodeSettings.enableHeartbeat) {
    return null;
  }

  const apiKey = getEnvValue('HEARTBEAT_API_KEY');
  const url = getEnvValue('HEARTBEAT_URL');
  const heartbeatId = getEnvValue('HEARTBEAT_ID');
  if (!apiKey || !url || !heartbeatId) {
    return null;
  }

  // TODO: add statistics here
  const payload = {};

  const request = {
    url,
    method: 'post' as const,
    data: {
      api_key: apiKey,
      deployment_id: heartbeatId,
      payload,
    },
    timeout: 5_000,
  };

  return await execute(request);
}
