import * as aggregation from './aggregation';
import * as fixtures from '../../../test/fixtures';
import { RequestStatus } from '../../types';

describe('aggregate (API calls)', () => {
  it('ignores requests that are not pending', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ status: RequestStatus.Errored }),
      fixtures.requests.buildApiCall({ status: RequestStatus.Ignored }),
      fixtures.requests.buildApiCall({ status: RequestStatus.Blocked }),
      fixtures.requests.buildApiCall({ status: RequestStatus.Fulfilled }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({});
  });

  it('groups calls if they have the exact same attributes', () => {
    const endpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353';
    const apiCalls = [
      fixtures.requests.buildApiCall({ endpointId }),
      fixtures.requests.buildApiCall({ endpointId }),
      fixtures.requests.buildApiCall({ endpointId }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        sponsorAddress: '3', //TODO: fix value
        airnodeAddress: 'airnodeAddress',
        clientAddress: 'clientAddress',
        sponsorWallet: 'sponsorWallet',
        chainId: '31337',
        endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        endpointName: 'convertToUSD',
        id: 'apiCallId',
        oisTitle: 'Currency Converter API',
        parameters: { from: 'ETH' },
      },
    });
  });

  it('groups calls if they have they different attributes unrelated to the API call', () => {
    const endpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353';
    const apiCalls = [
      fixtures.requests.buildApiCall({ endpointId, fulfillAddress: '0x123' }),
      fixtures.requests.buildApiCall({ endpointId, fulfillAddress: '0x456' }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        sponsorAddress: '3', //TODO: fix value
        airnodeAddress: 'airnodeAddress',
        clientAddress: 'clientAddress',
        sponsorWallet: 'sponsorWallet',
        chainId: '31337',
        endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        endpointName: 'convertToUSD',
        id: 'apiCallId',
        oisTitle: 'Currency Converter API',
        parameters: { from: 'ETH' },
      },
    });
  });
});
