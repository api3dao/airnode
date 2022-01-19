import * as verification from './api-call-verification';
import * as fixtures from '../../../test/fixtures';

describe('request ID verification', () => {
  it('returns false for invalid full request', () => {
    const apiCall = fixtures.buildAggregatedRegularApiCall({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      sponsorWalletAddress: '0xd5e6a768f1d23d30B386Bb5c125DBe83A9c40c73', // TODO: Fix invalid sponsor wallet address
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x7c1de7e1',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0x67caaa2862cf971502d5c5b3d94d09d15c770f3313e76aa95c296b6587e7e5f1',
      requestCount: '5',
      templateId: '0xe29a81893520cc4964bea1bc003e836e658c8043ba841fb7e5f7f91fe99fbb5b',
      requestType: 'template',
    });

    const isValid = verification.isValidRequestId(apiCall);

    expect(isValid).toBe(true);
  });

  it('returns true for valid full request', () => {
    const apiCall = fixtures.buildAggregatedRegularApiCall();

    const isValid = verification.isValidRequestId(apiCall);

    expect(isValid).toBe(true);
  });

  it('returns false for invalid template request id', () => {
    const apiCall = fixtures.buildAggregatedRegularApiCall({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      sponsorWalletAddress: '0xd5e6a768f1d23d30B386Bb5c125DBe83A9c40c73', // TODO: Fix invalid sponsor wallet address
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x7c1de7e1',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0xinvalid',
      requestCount: '5',
      templateId: '0xe29a81893520cc4964bea1bc003e836e658c8043ba841fb7e5f7f91fe99fbb5b',
      requestType: 'template',
    });
    const expectedId = '0x67caaa2862cf971502d5c5b3d94d09d15c770f3313e76aa95c296b6587e7e5f1';

    const isValid = verification.isValidRequestId(apiCall);
    const computedRequestId = verification.getExpectedRequestId(apiCall);

    expect(isValid).toBe(false);
    expect(computedRequestId).toBe(expectedId);
  });

  it('returns false for invalid full request id', () => {
    const apiCall = fixtures.buildAggregatedRegularApiCall({
      id: '0xinvalid',
    });
    const expectedId = '0xf40127616f09d41b20891bcfd326957a0e3d5a5ecf659cff4d8106c04b024374';

    const isValid = verification.isValidRequestId(apiCall);
    const computedRequestId = verification.getExpectedRequestId(apiCall);

    expect(isValid).toBe(false);
    expect(computedRequestId).toBe(expectedId);
  });
});
