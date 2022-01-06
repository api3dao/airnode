// TODO: Merge this file with request-verification.ts
import { ethers } from 'ethers';
import { RegularAggregatedApiCall } from '../../types';
interface ValidatedField {
  readonly type: string;
  readonly value: any;
}

function getValidatedFields(apiCall: RegularAggregatedApiCall): ValidatedField[] {
  const {
    requestType,
    chainId,
    requesterAddress,
    metadata,
    requestCount,
    templateId,
    sponsorAddress,
    sponsorWalletAddress,
    fulfillAddress,
    fulfillFunctionId,
    encodedParameters,
    airnodeAddress,
    endpointId,
  } = apiCall;

  switch (requestType) {
    case 'template':
      return [
        { value: ethers.BigNumber.from(chainId), type: 'uint256' },
        { value: metadata.address, type: 'address' },
        { value: requesterAddress, type: 'address' },
        { value: ethers.BigNumber.from(requestCount), type: 'uint256' },
        { value: templateId, type: 'bytes32' },
        { value: sponsorAddress, type: 'address' },
        { value: sponsorWalletAddress, type: 'address' },
        { value: fulfillAddress, type: 'address' },
        { value: fulfillFunctionId, type: 'bytes4' },
        { value: encodedParameters, type: 'bytes' },
      ];
    case 'full':
      return [
        { value: ethers.BigNumber.from(chainId), type: 'uint256' },
        { value: metadata.address, type: 'address' },
        { value: requesterAddress, type: 'address' },
        { value: ethers.BigNumber.from(requestCount), type: 'uint256' },
        { value: airnodeAddress, type: 'address' },
        { value: endpointId, type: 'bytes32' },
        { value: sponsorAddress, type: 'address' },
        { value: sponsorWalletAddress, type: 'address' },
        { value: fulfillAddress, type: 'address' },
        { value: fulfillFunctionId, type: 'bytes4' },
        { value: encodedParameters, type: 'bytes' },
      ];
  }
}

export function getExpectedRequestId(apiCall: RegularAggregatedApiCall): string {
  const validatedFields = getValidatedFields(apiCall);

  const types = validatedFields.map((v) => v.type);
  const values = validatedFields.map((v) => v.value);

  return ethers.utils.keccak256(ethers.utils.solidityPack(types, values));
}

export function isValidRequestId(apiCall: RegularAggregatedApiCall): boolean {
  const expectedRequestId = getExpectedRequestId(apiCall);
  return apiCall.id === expectedRequestId;
}
