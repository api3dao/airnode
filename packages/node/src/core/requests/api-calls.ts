import flatMap from 'lodash/flatMap';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import { AggregatedApiCall, ApiCall, ClientRequest, WalletDataByIndex } from '../../types';

export function isDuplicate(apiCall: ClientRequest<ApiCall>, aggregatedApiCall: AggregatedApiCall): boolean {
  const fields = ['id', 'endpointId', 'parameters'];
  return isEqual(pick(apiCall, fields), pick(aggregatedApiCall, fields));
}

export function flatten(walletDataByIndex: WalletDataByIndex): ClientRequest<ApiCall>[] {
  const walletIndices = Object.keys(walletDataByIndex);

  return flatMap(walletIndices, (index) => {
    return walletDataByIndex[index].requests.apiCalls;
  });
}

export function getStatusCode(apiCall: ClientRequest<ApiCall>): number {
  // IMPORTANT: A status code of "0" indicates that there were no errors.
  // Returning anything other than "0" will result in error handlers
  // being triggered in the relevant contracts when submitting transactions.
  return apiCall.errorCode || 0;
}
