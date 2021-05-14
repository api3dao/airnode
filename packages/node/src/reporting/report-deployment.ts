import { execute } from '@airnode/adapter';
import { go } from '../utils/promise-utils';
import { getEnvValue } from '../config';
import { CoordinatorState } from '../types';

export async function reportDeployment(state: CoordinatorState) {
  if (!state.config.nodeSettings.enableDeploymentReporting) {
    return null;
  }

  const apiKey = getEnvValue('DEPLOYMENT_REPORTING_API_KEY');
  const url = getEnvValue('DEPLOYMENT_REPORTING_URL');
  const deploymentId = getEnvValue('DEPLOYMENT_REPORTING_ID');
  if (!apiKey || !url || !deploymentId) {
    return null;
  }

  // TODO: add statistics here
  const payload = {};

  const request = {
    url,
    method: 'post' as const,
    data: {
      api_key: apiKey,
      deployment_id: deploymentId,
      payload,
    },
    timeout: 5_000,
  };
  // Catch any reporting errors
  const [err, _res] = await go(execute(request));
  return err;
}
