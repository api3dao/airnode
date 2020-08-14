import { config } from '../config';
import { CoordinatorState } from '../../types';

export function callApis(state: CoordinatorState) {
  const { aggregatedApiCalls } = state;

  const apiCallRequests = aggregatedApiCalls
    .filter((ac) => ac.type === 'request')
    .map((ac) => {
      const trigger = config.triggers.requests.find((r) => r.endpointId === ac.endpointId)!;
      return { ...ac, oisTitle: trigger.oisTitle, endpointName: trigger.endpointName };
    });

  return apiCallRequests;
}
