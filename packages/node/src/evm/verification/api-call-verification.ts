import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { ApiCall, Request, LogsData, RequestErrorCode, RequestStatus } from '../../types';

interface ValidatedField {
  readonly type: string;
  readonly value: any;
}

function getValidatedFields(apiCall: Request<ApiCall>): ValidatedField[] {
  switch (apiCall.type) {
    case 'regular':
      return [
        { value: ethers.BigNumber.from(apiCall.requestCount), type: 'uint256' },
        { value: ethers.BigNumber.from(apiCall.chainId), type: 'uint256' },
        { value: apiCall.requesterAddress, type: 'address' },
        { value: apiCall.templateId, type: 'bytes32' },
        { value: apiCall.encodedParameters, type: 'bytes' },
      ];

    case 'full':
      return [
        { value: ethers.BigNumber.from(apiCall.requestCount), type: 'uint256' },
        { value: ethers.BigNumber.from(apiCall.chainId), type: 'uint256' },
        { value: apiCall.requesterAddress, type: 'address' },
        { value: apiCall.endpointId, type: 'bytes32' },
        { value: apiCall.encodedParameters, type: 'bytes' },
      ];
  }
}

function getExpectedRequestId(apiCall: Request<ApiCall>): string {
  const validatedFields = getValidatedFields(apiCall);

  const types = validatedFields.map((v) => v.type);
  const values = validatedFields.map((v) => v.value);

  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(types, values));
}

export function verifyApiCallIds(apiCalls: Request<ApiCall>[]): LogsData<Request<ApiCall>[]> {
  const logsWithVerifiedApiCalls: LogsData<Request<ApiCall>>[] = apiCalls.map((apiCall) => {
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
        errorCode: RequestErrorCode.RequestInvalid,
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
