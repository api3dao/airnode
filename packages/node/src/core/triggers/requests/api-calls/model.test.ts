import { ethers } from 'ethers';
import * as model from './model';
import * as providerState from '../../../providers/state';
import { ApiCall, ExtendedRegularRequest, ProviderState, RequestErrorCode } from '../../../../types';

describe('initialize', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('decodes parameters and builds a request from the log', () => {
    const log: any = {
      args: {
        providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
        requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
        requester: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
        fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        fulfillFunctionId: '0x042f2b65',
        errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        errorFunctionId: '0xba12a5e4',
        parameters: '0x636b6579a169736f6d657468696e676576616c7565',
      },
    };

    expect(model.initialize(state, log)).toEqual({
      endpointId: null,
      errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      errorFunctionId: '0xba12a5e4',
      fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      fulfillFunctionId: '0x042f2b65',
      encodedParameters: '0x636b6579a169736f6d657468696e676576616c7565',
      parameters: {
        key: { something: 'value' },
      },
      requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
      requesterAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
      valid: true,
    });
  });

  it('sets the request to invalid if the parameters cannot be decoded', () => {
    const log: any = {
      args: {
        providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
        requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
        requester: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
        fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        fulfillFunctionId: '0x042f2b65',
        errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        errorFunctionId: '0xba12a5e4',
        parameters: '0xincorrectparameters',
      },
    };

    expect(model.initialize(state, log)).toEqual({
      encodedParameters: '0xincorrectparameters',
      endpointId: null,
      errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      errorCode: 1,
      errorFunctionId: '0xba12a5e4',
      fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      fulfillFunctionId: '0x042f2b65',
      parameters: {},
      requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
      requesterAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
      valid: false,
    });
  });
});

describe('validate', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('does nothing if the request is already invalid', () => {
    const request = createApiCallRequest({ valid: false, errorCode: 9999 });
    const res = model.validate(state, request);
    expect(res.valid).toEqual(false);
    expect(res.errorCode).toEqual(9999);
  });

  it('validates the current balance is greater than the current balance', () => {
    const sufficientBalance = createApiCallRequest({ walletBalance: ethers.BigNumber.from('10') });
    const matchingBalance = createApiCallRequest({ walletBalance: ethers.BigNumber.from('5') });
    const insufficientBalance = createApiCallRequest({ walletBalance: ethers.BigNumber.from('2') });

    const sufficientValidated = model.validate(state, sufficientBalance);
    expect(sufficientValidated.valid).toEqual(true);
    expect(sufficientValidated.errorCode).toEqual(undefined);

    const matchingValidated = model.validate(state, matchingBalance);
    expect(matchingValidated.valid).toEqual(true);
    expect(matchingValidated.errorCode).toEqual(undefined);

    const insufficientValidated = model.validate(state, insufficientBalance);
    expect(insufficientValidated.valid).toEqual(false);
    expect(insufficientValidated.errorCode).toEqual(RequestErrorCode.InsufficientBalance);
  });

  function createApiCallRequest(params?: any): ExtendedRegularRequest<ApiCall> {
    return {
      requestId: 'requestId',
      requesterId: 'requestId',
      requesterAddress: 'requesterAddress',
      endpointId: 'endpointId',
      templateId: null,
      fulfillAddress: 'fulfillAddress',
      fulfillFunctionId: 'fulfillFunctionId',
      errorAddress: 'errorAddress',
      errorFunctionId: 'errorFunctionId',
      encodedParameters: 'encodedParameters',
      parameters: { from: 'ETH' },
      valid: true,
      walletIndex: 123,
      walletAddress: 'walletAddress',
      walletBalance: ethers.BigNumber.from('10'),
      walletMinimumBalance: ethers.BigNumber.from('5'),
      ...params,
    };
  }
});
