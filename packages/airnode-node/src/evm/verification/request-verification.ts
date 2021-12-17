import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import { OIS } from '@api3/airnode-ois';
import * as logger from '../../logger';
import * as wallet from '../wallet';
import { ApiCall, Request, LogsData, RequestErrorMessage, RequestStatus, Trigger } from '../../types';

export const isValidSponsorWallet = (hdNode: ethers.utils.HDNode, sponsor: string, sponsorWallet: string) => {
  const derivedSponsorWallet = wallet.deriveSponsorWallet(hdNode, sponsor);
  return derivedSponsorWallet.address === sponsorWallet;
};

// TODO: Remove this once https://api3dao.atlassian.net/browse/AN-400 is done
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

    const expectedSponsorWalletAddress = wallet.deriveSponsorWallet(masterHDNode, request.sponsorAddress).address;
    if (request.sponsorWalletAddress !== expectedSponsorWalletAddress) {
      const message = `Invalid sponsor wallet:${request.sponsorWalletAddress} for Request:${request.id}. Expected:${expectedSponsorWalletAddress}`;
      const log = logger.pend('ERROR', message);
      const updatedRequest: Request<T> = {
        ...request,
        status: RequestStatus.Ignored,
        errorMessage: `${RequestErrorMessage.SponsorWalletInvalid}: ${request.sponsorWalletAddress}`,
      };
      return [[log], updatedRequest];
    }

    const message = `Request ID:${request.id} is linked to a valid sponsor wallet:${request.sponsorWalletAddress}`;
    const log = logger.pend('DEBUG', message);
    return [[log], request];
  });

  const logs = flatMap(logsWithVerifiedRequests, (r) => r[0]);
  const verifiedRequests = flatMap(logsWithVerifiedRequests, (r) => r[1]);
  return [logs, verifiedRequests];
}

export function verifyRrpTriggers(
  apiCalls: Request<ApiCall>[],
  rrpTriggers: Trigger[],
  oises: OIS[]
): LogsData<Request<ApiCall>[]> {
  const logsWithVerifiedApiCalls: LogsData<Request<ApiCall>>[] = apiCalls.map((apiCall) => {
    if (apiCall.status !== RequestStatus.Pending) {
      // TODO: Do we need to log this? We do not follow the same practice in applySponsorAndSponsorWalletRequestLimit
      // (once the request is ignored it is not further mentioned in future logs)
      const message = `Trigger verification skipped for Request:${apiCall.id} as it has status:${apiCall.status}`;
      const log = logger.pend('DEBUG', message);
      return [[log], apiCall];
    }

    const rrpTrigger = rrpTriggers.find((t) => t.endpointId === apiCall.endpointId);
    // If the request is for an unknown endpointId, the problem is with the requesting requester contract
    if (!rrpTrigger) {
      const message = `Request:${apiCall.id} has no matching endpointId:${apiCall.endpointId} in Airnode config`;
      const log = logger.pend('WARN', message);
      const updatedApiCall: Request<ApiCall> = {
        ...apiCall,
        status: RequestStatus.Errored,
        errorMessage: `${RequestErrorMessage.UnknownEndpointId}: ${apiCall.endpointId}`,
      };
      return [[log], updatedApiCall];
    }

    const { oisTitle, endpointName } = rrpTrigger;
    const ois = oises.find((o) => o.title === oisTitle);
    // Although unlikely, it is possible that the Airnode instance was configured with a trigger
    // with an 'oisTitle' that does not match an OIS in config.json. The responsibility to fix this
    // lies with the API provider
    if (!ois) {
      const log = logger.pend('ERROR', `Unknown OIS:${oisTitle} received for Request:${apiCall.id}`);
      const updatedApiCall: Request<ApiCall> = {
        ...apiCall,
        status: RequestStatus.Errored,
        errorMessage: `${RequestErrorMessage.UnknownOIS}: ${oisTitle}`,
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
      const updatedApiCall: Request<ApiCall> = {
        ...apiCall,
        status: RequestStatus.Errored,
        errorMessage: `${RequestErrorMessage.UnknownEndpointName}: ${endpointName} for OIS ${oisTitle}`,
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
