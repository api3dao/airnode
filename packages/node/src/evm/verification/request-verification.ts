import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import { OIS } from '@api3/ois';
import * as logger from '../../logger';
import * as wallet from '../wallet';
import { ApiCall, Request, LogsData, RequestErrorCode, RequestStatus, RequestTrigger } from '../../types';

export function verifySponsorWallets<T>(
  requests: Request<T>[],
  masterHDNode: ethers.utils.HDNode
): LogsData<Request<T>[]> {
  const logsWithVerifiedRequests: LogsData<Request<T>>[] = requests.map((request) => {
    if (request.status !== RequestStatus.Pending) {
      const message = `Sponsor wallet verification skipped for Request:${request.id} as it has status:${request.status}`;
      const log = logger.pend('DEBUG', message);
      return [[log], request];
    }

    const expectedSponsorWallet = wallet.deriveSponsorWallet(masterHDNode, request.sponsorAddress).address;
    if (request.sponsorWallet !== expectedSponsorWallet) {
      const message = `Invalid sponsor wallet:${request.sponsorWallet} for Request:${request.id}. Expected:${expectedSponsorWallet}`;
      const log = logger.pend('ERROR', message);
      const updatedRequest = {
        ...request,
        status: RequestStatus.Ignored,
        errorCode: RequestErrorCode.SponsorWalletInvalid,
      };
      return [[log], updatedRequest];
    }

    const message = `Request ID:${request.id} is linked to a valid sponsor wallet:${request.sponsorWallet}`;
    const log = logger.pend('DEBUG', message);
    return [[log], request];
  });

  const logs = flatMap(logsWithVerifiedRequests, (r) => r[0]);
  const verifiedRequests = flatMap(logsWithVerifiedRequests, (r) => r[1]);
  return [logs, verifiedRequests];
}

export function verifyTriggers(
  apiCalls: Request<ApiCall>[],
  triggers: RequestTrigger[],
  oises: OIS[]
): LogsData<Request<ApiCall>[]> {
  const logsWithVerifiedApiCalls: LogsData<Request<ApiCall>>[] = apiCalls.map((apiCall) => {
    if (apiCall.status !== RequestStatus.Pending) {
      const message = `Trigger verification skipped for Request:${apiCall.id} as it has status:${apiCall.status}`;
      const log = logger.pend('DEBUG', message);
      return [[log], apiCall];
    }

    const trigger = triggers.find((t) => t.endpointId === apiCall.endpointId);
    // If the request is for an unknown endpointId, the problem is with the requesting requester contract
    if (!trigger) {
      const message = `Request:${apiCall.id} has no matching endpointId:${apiCall.endpointId} in Airnode config`;
      const log = logger.pend('WARN', message);
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Errored,
        errorCode: RequestErrorCode.UnknownEndpointId,
      };
      return [[log], updatedApiCall];
    }

    const { oisTitle, endpointName } = trigger;
    const ois = oises.find((o) => o.title === oisTitle);
    // Although unlikely, it is possible that the Airnode instance was configured with a trigger
    // with an 'oisTitle' that does not match an OIS in config.json. The responsibility to fix this
    // lies with the API provider
    if (!ois) {
      const log = logger.pend('ERROR', `Unknown OIS:${oisTitle} received for Request:${apiCall.id}`);
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Errored,
        errorCode: RequestErrorCode.UnknownOIS,
      };
      return [[log], updatedApiCall];
    }

    const endpoint = ois.endpoints.find((e) => e.name === endpointName);
    // Although unlikely, it is possible that the Airnode instance was configured with a trigger
    // with an 'endpointName' that does not match an endpoint within the given OIS in config.json.
    // The responsibility to fix this lies with the API provider
    if (!endpoint) {
      const log = logger.pend(
        'ERROR',
        `Unknown Endpoint:${endpointName} for OIS:${oisTitle} received for Request:${apiCall.id}`
      );
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Errored,
        errorCode: RequestErrorCode.UnknownOIS,
      };
      return [[log], updatedApiCall];
    }

    const log = logger.pend('DEBUG', `Request ID:${apiCall.id} is linked to a valid endpointId:${apiCall.endpointId}`);
    return [[log], apiCall];
  });

  const logs = flatMap(logsWithVerifiedApiCalls, (r) => r[0]);
  const verifiedRequests = flatMap(logsWithVerifiedApiCalls, (r) => r[1]);
  return [logs, verifiedRequests];
}
