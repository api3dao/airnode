import { config } from '../config';
import { goTimeout } from '../utils/promise-utils';
import { spawnNewApiCall } from '../api-caller/worker';
import { CoordinatorState } from '../../types';

const WORKER_TIMEOUT = 29_500;

export async function callApis(state: CoordinatorState) {
  const apiCallRequests = state.aggregatedApiCalls
    .filter((ac) => ac.type === 'request')
    .map((ac) => {
      const trigger = config.triggers.requests.find((r) => r.endpointId === ac.endpointId)!;
      return { ...ac, oisTitle: trigger.oisTitle, endpointName: trigger.endpointName };
    });

  const calls = apiCallRequests.map(async (apiCall) => {
    const [err, res] = await goTimeout(WORKER_TIMEOUT, spawnNewApiCall(apiCall));
    if (err || !res) {
      return { id: apiCall.id, error: err };
    }
    return { id: apiCall.id, data: res };
  });

  const results = await Promise.all(calls);

  return results;
}
