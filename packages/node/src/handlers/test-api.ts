import find from 'lodash/find';
import * as wallet from '../evm/wallet';
import { randomString } from '../utils/string-utils';
import { AggregatedApiCall, Config, WorkerOptions, ApiCallResponse } from '../types';
import * as logger from '../logger';
import { go } from '../utils/promise-utils';
import { spawnNewApiCall } from '../adapters/http/worker';
import { WORKER_CALL_API_TIMEOUT } from '../constants';

export async function testApi(
  config: Config,
  endpointId: string,
  parameters: Record<string, string>
): Promise<[Error, null] | [null, ApiCallResponse]> {
  const testCallId = randomString(8);
  const masterHDNode = wallet.getMasterHDNode();

  const logOptions = logger.buildBaseOptions(config, { requestId: testCallId });

  const triggerRequest = find(config.triggers.request, ['endpointId', endpointId]);
  if (!triggerRequest) {
    return [new Error(`No such endpoint with ID '${endpointId}'`), null];
  }

  const workerOpts: WorkerOptions = {
    cloudProvider: config.nodeSettings.cloudProvider,
    airnodeIdShort: wallet.getAirnodeIdShort(masterHDNode),
    stage: config.nodeSettings.stage,
    region: config.nodeSettings.region,
  };

  const aggregatedApiCall: AggregatedApiCall = {
    id: testCallId,
    airnodeId: wallet.getAirnodeId(masterHDNode),
    requesterIndex: '',
    clientAddress: '',
    designatedWallet: '',
    chainId: '',
    endpointId,
    endpointName: triggerRequest.endpointName,
    oisTitle: triggerRequest.oisTitle,
    parameters,
  };

  const [err, logData] = await go(() => spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts, false), {
    timeoutMs: WORKER_CALL_API_TIMEOUT,
  });

  const resLogs = logData ? logData[0] : [];
  logger.logPending(resLogs, logOptions);

  if (err || !logData || !logData[1]) {
    return [err || new Error('An unkown error occurred'), null];
  }

  return [null, logData[1]];
}
