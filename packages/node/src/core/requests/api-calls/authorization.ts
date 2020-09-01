import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatten from 'lodash/flatten';
import get from 'lodash/get';
import isNil from 'lodash/isNil';
import uniqBy from 'lodash/uniqBy';
import * as model from './model';
import * as ethereum from '../../ethereum';
import * as logger from '../../utils/logger';
import { go, retryOperation } from '../../utils/promise-utils';
import {
  ApiCall,
  ClientRequest,
  ProviderState,
  RequestErrorCode,
  RequestStatus,
  WalletDataByIndex,
} from '../../../types';

interface AuthorizationStatus {
  authorized: boolean;
  endpointId: string;
  requesterAddress: string;
}

interface AuthorizationByRequester {
  [id: string]: boolean;
}

export interface AuthorizationByEndpointId {
  [id: string]: AuthorizationByRequester;
}

async function fetchAuthorizationStatuses(
  state: ProviderState,
  apiCalls: ClientRequest<ApiCall>[]
): Promise<AuthorizationStatus[] | null> {
  const { Convenience } = ethereum.contracts;

  // Ordering must remain the same when mapping these two arrays
  const endpointIds = apiCalls.map((a) => a.endpointId);
  const requesters = apiCalls.map((a) => a.requesterAddress);

  const contract = new ethers.Contract(Convenience.addresses[state.config.chainId], Convenience.ABI, state.provider);
  const contractCall = () => contract.checkAuthorizationStatuses(endpointIds, requesters);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const [err, data] = await go(retryableContractCall);
  if (err || !data) {
    logger.logProviderError(state.config.name, 'Failed to fetch authorization details', err);
    return null;
  }

  const authorizations = apiCalls.reduce((acc, apiCall, index) => {
    const status: AuthorizationStatus = {
      endpointId: apiCall.endpointId!,
      requesterAddress: apiCall.requesterAddress,
      authorized: data[index],
    };
    return [...acc, status];
  }, []);

  return authorizations;
}

export async function fetch(state: ProviderState): Promise<AuthorizationByEndpointId> {
  const flatApiCalls = model.flatten(state);

  // If an API call has a templateId but the template failed to load, then we cannot process
  // that request. These requests will be marked as blocked.
  const pendingApiCalls = flatApiCalls.filter((a) => a.status === RequestStatus.Pending);

  // Remove duplicate API calls with the same endpoint ID and requester address
  const uniquePairs = uniqBy(pendingApiCalls, (a) => `${a.endpointId}-${a.requesterAddress}`);

  // Request groups of 10 at a time
  const groupedPairs = chunk(uniquePairs, 10);

  // Fetch all authorization statuses in parallel
  const promises = groupedPairs.map((pairs) => fetchAuthorizationStatuses(state, pairs));

  const results = await Promise.all(promises);
  const successfulResults = flatten(results.filter((r) => !!r)) as AuthorizationStatus[];

  // Store each "authorization" against the endpointId so it can be easily looked up
  const authorizationsByEndpoint = successfulResults.reduce((acc, result) => {
    const currentEndpointRequesters = acc[result.endpointId] || {};
    const requesterAuthorization = { [result.requesterAddress]: result.authorized };
    const updatedEnpointRequesters = { ...currentEndpointRequesters, ...requesterAuthorization };

    return { ...acc, [result.endpointId]: updatedEnpointRequesters };
  }, {});

  return authorizationsByEndpoint;
}

export function mergeAuthorizations(
  state: ProviderState,
  authorizationsByEndpoint: AuthorizationByEndpointId
): WalletDataByIndex {
  const walletIndices = Object.keys(state.walletDataByIndex);

  const walletDataByIndex = walletIndices.reduce((acc, index) => {
    const walletData = state.walletDataByIndex[index];
    const { requests } = walletData;

    const updatedApiCalls = requests.apiCalls.map((apiCall) => {
      // Don't overwrite any existing error codes
      if (apiCall.errorCode) {
        return apiCall;
      }

      // There should always be an endpointId at this point, but just in case, check again
      // and drop the request if it is missing. If endpointId is missing, it means that the
      // template was not loaded
      if (!apiCall.endpointId) {
        const message = `No Endpoint ID found for Request ID:${apiCall.id}`;
        logger.logProviderJSON(state.config.name, 'ERROR', message);
        return { ...apiCall, status: RequestStatus.Blocked, errorCode: RequestErrorCode.TemplateNotFound };
      }

      const isRequestedAuthorized = get(authorizationsByEndpoint, [apiCall.endpointId, apiCall.requesterAddress]);

      // If we couldn't fetch the authorization status, block the request until the next run
      if (isNil(isRequestedAuthorized)) {
        const message = `Authorization not found for Request ID:${apiCall.id}`;
        logger.logProviderJSON(state.config.name, 'WARN', message);
        return { ...apiCall, status: RequestStatus.Blocked, errorCode: RequestErrorCode.AuthorizationNotFound };
      }

      if (isRequestedAuthorized) {
        return apiCall;
      }

      const message = `Client:${apiCall.requesterAddress} is not authorized to access Endpoint ID:${apiCall.endpointId} for Request ID:${apiCall.id}`;
      logger.logProviderJSON(state.config.name, 'WARN', message);

      return { ...apiCall, status: RequestStatus.Errored, errorCode: RequestErrorCode.UnauthorizedClient };
    });

    const updatedRequests = { ...requests, apiCalls: updatedApiCalls };
    const updatedWalletData = { ...walletData, requests: updatedRequests };

    return { ...acc, [index]: updatedWalletData };
  }, {});

  return walletDataByIndex;
}
