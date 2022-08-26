import { ethers } from 'ethers';
import { logger } from '@api3/airnode-utilities';
import * as wallet from '../wallet';
import { ApiCall, Request, LogsData, UpdatedRequests } from '../../types';
import { RrpTrigger } from '../../config';

// TODO: Remove this once https://api3dao.atlassian.net/browse/AN-400 is done
export function verifySponsorWallets<T>(
  unverifiedRequests: Request<T>[],
  masterHDNode: ethers.utils.HDNode
): LogsData<Request<T>[]> {
  const { logs, requests } = unverifiedRequests.reduce(
    (acc, request) => {
      const expectedSponsorWalletAddress = wallet.deriveSponsorWallet(masterHDNode, request.sponsorAddress).address;
      if (request.sponsorWalletAddress !== expectedSponsorWalletAddress) {
        const message = `Invalid sponsor wallet:${request.sponsorWalletAddress} for Request:${request.id}. Expected:${expectedSponsorWalletAddress}`;
        const log = logger.pend('ERROR', message);
        return { ...acc, logs: [...acc.logs, log] };
      }

      const message = `Request ID:${request.id} is linked to a valid sponsor wallet:${request.sponsorWalletAddress}`;
      const log = logger.pend('DEBUG', message);
      return { ...acc, logs: [...acc.logs, log], requests: [...acc.requests, request] };
    },
    { logs: [], requests: [] } as UpdatedRequests<T>
  );
  return [logs, requests];
}

export function verifyRrpTriggers(
  apiCalls: Request<ApiCall>[],
  rrpTriggers: RrpTrigger[]
): LogsData<Request<ApiCall>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall) => {
      const rrpTrigger = rrpTriggers.find((t) => t.endpointId === apiCall.endpointId);
      // If the request is for an unknown endpointId, the problem is with the requesting requester contract
      if (!rrpTrigger) {
        const message = `Request:${apiCall.id} has no matching endpointId:${apiCall.endpointId} in Airnode config`;
        const log = logger.pend('WARN', message);
        return { ...acc, logs: [...acc.logs, log] };
      }

      const log = logger.pend(
        'DEBUG',
        `Request ID:${apiCall.id} is linked to a valid endpointId:${apiCall.endpointId}`
      );
      return { ...acc, logs: [...acc.logs, log], requests: [...acc.requests, apiCall] };
    },
    { logs: [], requests: [] } as UpdatedRequests<ApiCall>
  );
  return [logs, requests];
}
