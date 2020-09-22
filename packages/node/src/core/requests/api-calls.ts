import flatMap from 'lodash/flatMap';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import { AggregatedApiCall, ApiCall, ClientRequest, WalletDataByIndex } from '../../types';

export function isDuplicate(apiCall: ClientRequest<ApiCall>, aggregatedApiCall: AggregatedApiCall): boolean {
  // First compare the ID as it's much faster, if there is a matching request then compare the
  // rest of the (relevant) attributes
  if (apiCall.id === aggregatedApiCall.id) {
    return true;
  }
  const fields = ['id', 'endpointId', 'parameters'];
  return isEqual(pick(apiCall, fields), pick(aggregatedApiCall, fields));
}

export function flatten(walletDataByIndex: WalletDataByIndex): ClientRequest<ApiCall>[] {
  const walletIndices = Object.keys(walletDataByIndex);

  return flatMap(walletIndices, (index) => {
    return walletDataByIndex[index].requests.apiCalls;
  });
}
