import find from 'lodash/find';
import * as wallet from '../evm/wallet';
import { randomString } from '../utils/string-utils';
import { AggregatedApiCall, Config, WorkerOptions, ApiCallSuccessResponse } from '../types';
import * as logger from '../logger';
import { go } from '../utils/promise-utils';
import { spawnNewApiCall } from '../adapters/http/worker';
import { WORKER_CALL_API_TIMEOUT } from '../constants';

export async function testApi(
  config: Config,
  endpointId: string,
  parameters: Record<string, string>
): Promise<[Error, null] | [null, ApiCallSuccessResponse]> {
  const testCallId = randomString(8);
  const airnodeAddress = wallet.getAirnodeWallet(config).address;

  const logOptions = logger.buildBaseOptions(config, { requestId: testCallId });

  const httpTrigger = find(config.triggers.http, ['endpointId', endpointId]);
  if (!httpTrigger) {
    return [new Error(`Unable to find endpoint with ID:'${endpointId}'`), null];
  }

  const endpoints = find(config.ois, ['title', httpTrigger.oisTitle])?.endpoints;
  const endpoint = find(endpoints, ['name', httpTrigger.endpointName]);

  if (!endpoint) {
    return [new Error(`No endpoint definition for endpoint ID '${endpointId}'`), null];
  }

  const workerOpts: WorkerOptions = {
    cloudProvider: config.nodeSettings.cloudProvider,
    airnodeAddressShort: wallet.getAirnodeAddressShort(airnodeAddress),
    stage: config.nodeSettings.stage,
  };

  const aggregatedApiCall: AggregatedApiCall = {
    type: 'testing-gateway',
    id: testCallId,
    airnodeAddress,
    endpointId,
    endpointName: httpTrigger.endpointName,
    oisTitle: httpTrigger.oisTitle,
    parameters,
  };

  const [err, logData] = await go(() => spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts), {
    timeoutMs: WORKER_CALL_API_TIMEOUT,
  });

  const resLogs = logData ? logData[0] : [];
  logger.logPending(resLogs, logOptions);

  if (err || !logData || !logData[1]?.success) {
    return [err || new Error('An unknown error occurred'), null];
  }

  return [null, logData[1]];
}
