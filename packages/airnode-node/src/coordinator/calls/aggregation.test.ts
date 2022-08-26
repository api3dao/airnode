import * as aggregation from './aggregation';
import * as fixtures from '../../../test/fixtures';

describe('aggregate (API calls)', () => {
  it('groups calls if they have the exact same attributes', () => {
    const endpointId = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';
    const apiCalls = [
      fixtures.requests.buildApiCall({ endpointId }),
      fixtures.requests.buildApiCall({ endpointId }),
      fixtures.requests.buildApiCall({ endpointId }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        sponsorAddress: 'sponsorAddress',
        airnodeAddress: 'airnodeAddress',
        requesterAddress: 'requesterAddress',
        sponsorWalletAddress: 'sponsorWalletAddress',
        chainId: '31337',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        endpointName: 'convertToUSD',
        id: 'apiCallId',
        oisTitle: 'Currency Converter API',
        cacheResponses: false,
        parameters: { from: 'ETH' },
        encodedParameters: 'encodedParameters',
        fulfillAddress: 'fulfillAddress',
        fulfillFunctionId: 'fulfillFunctionId',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 10716082,
          currentBlock: 10716090,
          minConfirmations: 0,
          transactionHash: 'logTransactionHash',
          logIndex: 0,
        },
        requestCount: '12',
        requestType: 'template',
        templateId: null,
      },
    });
  });

  it('groups calls if they have they different attributes unrelated to the API call', () => {
    const endpointId = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';
    const apiCalls = [
      fixtures.requests.buildApiCall({ endpointId, fulfillAddress: '0x123' }),
      fixtures.requests.buildApiCall({ endpointId, fulfillAddress: '0x456' }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        sponsorAddress: 'sponsorAddress',
        airnodeAddress: 'airnodeAddress',
        requesterAddress: 'requesterAddress',
        sponsorWalletAddress: 'sponsorWalletAddress',
        chainId: '31337',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        endpointName: 'convertToUSD',
        id: 'apiCallId',
        oisTitle: 'Currency Converter API',
        cacheResponses: false,
        parameters: { from: 'ETH' },
        encodedParameters: 'encodedParameters',
        fulfillAddress: '0x123',
        fulfillFunctionId: 'fulfillFunctionId',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 10716082,
          currentBlock: 10716090,
          minConfirmations: 0,
          transactionHash: 'logTransactionHash',
          logIndex: 0,
        },
        requestCount: '12',
        requestType: 'template',
        templateId: null,
      },
    });
  });
});
