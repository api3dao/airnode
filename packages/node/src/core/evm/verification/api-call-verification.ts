import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { ApiCall, ClientRequest, LogsData, RequestErrorCode, RequestStatus } from '../../../types';

interface ValidatedField {
  name: string;
  type: string;
}

export const REQUEST_ID_FIELDS: ValidatedField[] = [
  { name: 'requestCount', type: 'uint256' },
  { name: 'templateId', type: 'bytes32' },
  { name: 'providerId', type: 'bytes32' },
  { name: 'endpointId', type: 'bytes32' },
  { name: 'encodedParameters', type: 'bytes' },
];

export function getExpectedRequestId(apiCall: ClientRequest<ApiCall>): string {
  // Ftiler out fields that are not set for the given API call
  const requestIdFields = REQUEST_ID_FIELDS.filter((f) => !!apiCall[f.name]);

  let types = requestIdFields.map((f) => f.type);
  let values = requestIdFields.map((f) => apiCall[f.name]);

  types = [types[0], types[1], types[3]];
  values = [ethers.BigNumber.from(values[0]), values[1], values[3]];

  console.log('=======================');
  console.log(requestIdFields);
  console.log(types);
  console.log(values);
  console.log('=======================');

  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(types, values));
}

export function verifyRequestId(apiCalls: ClientRequest<ApiCall>[]): LogsData<ClientRequest<ApiCall>[]> {
  const logsWithVerifiedApiCalls: LogsData<ClientRequest<ApiCall>>[] = apiCalls.map((apiCall) => {
    if (apiCall.status !== RequestStatus.Pending) {
      const log = logger.pend(
        'DEBUG',
        `Request ID verification skipped for Request:${apiCall.id} as it has status:${apiCall.status}`
      );
      return [[log], apiCall];
    }

    const expectedRequestId = getExpectedRequestId(apiCall);
    if (apiCall.id !== expectedRequestId) {
      const log = logger.pend('ERROR', `Invalid ID for Request:${apiCall.id}. Expected:${expectedRequestId}`);
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Ignored,
        errorCode: RequestErrorCode.InvalidRequestID,
      };
      return [[log], updatedApiCall];
    }

    const log = logger.pend('DEBUG', `Request ID:${apiCall.id} has a valid ID`);
    return [[log], apiCall];
  });

  const logs = flatMap(logsWithVerifiedApiCalls, (r) => r[0]);
  const verifiedApiCalls = flatMap(logsWithVerifiedApiCalls, (r) => r[1]);
  return [logs, verifiedApiCalls];
}
