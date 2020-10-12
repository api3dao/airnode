const getTemplatesMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      Contract: jest.fn().mockImplementation(() => ({
        getTemplates: getTemplatesMock,
      })),
    },
  };
});

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import * as fetching from './template-fetching';

describe('fetch (templates)', () => {
  let fetchOptions: any;

  beforeEach(() => {
    fetchOptions = {
      address: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
      provider: new ethers.providers.JsonRpcProvider(),
    };
  });

  it('fetches templates in groups of 10', async () => {
    const firstRawTemplates = {
      designatedWallets: Array.from(Array(10).keys()).map((n) => `designatedWallet-${n}`),
      endpointIds: Array.from(Array(10).keys()).map((n) => `endpointId-${n}`),
      fulfillAddresses: Array.from(Array(10).keys()).map((n) => `fulfillAddress-${n}`),
      fulfillFunctionIds: Array.from(Array(10).keys()).map((n) => `fulfillFunctionId-${n}`),
      parameters: Array.from(Array(10).keys()).map(() => '0x6874656d706c6174656576616c7565'),
      providerIds: Array.from(Array(10).keys()).map((n) => `providerId-${n}`),
      requesterInds: Array.from(Array(10).keys()).map((n) => `requesterInd-${n}`),
    };

    const secondRawTemplates = {
      designatedWallets: Array.from(Array(10).keys()).map((n) => `designatedWallet-${n + 10}`),
      endpointIds: Array.from(Array(9).keys()).map((n) => `endpointId-${n + 10}`),
      fulfillAddresses: Array.from(Array(9).keys()).map((n) => `fulfillAddress-${n + 10}`),
      fulfillFunctionIds: Array.from(Array(9).keys()).map((n) => `fulfillFunctionId-${n + 10}`),
      parameters: Array.from(Array(9).keys()).map(() => '0x6874656d706c6174656576616c7565'),
      providerIds: Array.from(Array(9).keys()).map((n) => `providerId-${n + 10}`),
      requesterInds: Array.from(Array(10).keys()).map((n) => `requesterInd-${n + 10}`),
    };

    getTemplatesMock.mockResolvedValueOnce(firstRawTemplates);
    getTemplatesMock.mockResolvedValueOnce(secondRawTemplates);

    const apiCalls = Array.from(Array(19).keys()).map((n) => {
      return fixtures.requests.createApiCall({
        id: `${n}`,
        templateId: `templateId-${n}`,
      });
    });

    const [logs, err, res] = await fetching.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(Object.keys(res).length).toEqual(19);
    expect(res['templateId-0']['endpointId']).toEqual('endpointId-0');
    expect(res['templateId-18']['endpointId']).toEqual('endpointId-18');

    expect(getTemplatesMock).toHaveBeenCalledTimes(2);
    expect(getTemplatesMock.mock.calls).toEqual([
      [Array.from(Array(10).keys()).map((n) => `templateId-${n}`)],
      [Array.from(Array(9).keys()).map((n) => `templateId-${n + 10}`)],
    ]);
  });

  it('returns all template attributes', async () => {
    const rawTemplates = {
      designatedWallets: ['designatedWallet-0'],
      endpointIds: ['endpointId-0'],
      fulfillAddresses: ['fulfillAddresses-0'],
      fulfillFunctionIds: ['fulfillFunctionId-0'],
      parameters: ['0x6874656d706c6174656576616c7565'],
      providerIds: ['providerId-0'],
      requesterInds: ['requesterIndex-0'],
    };
    getTemplatesMock.mockResolvedValueOnce(rawTemplates);

    const apiCalls = [fixtures.requests.createApiCall({ templateId: 'templateId-0' })];

    const [logs, err, res] = await fetching.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(res).toEqual({
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        endpointId: 'endpointId-0',
        providerId: 'providerId-0',
        fulfillAddress: 'fulfillAddresses-0',
        fulfillFunctionId: 'fulfillFunctionId-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        requesterIndex: 'requesterIndex-0',
        templateId: 'templateId-0',
      },
    });
  });

  it('filters out duplicate template IDs', async () => {
    const rawTemplates = {
      designatedWallets: ['designatedWallet-0'],
      endpointIds: ['endpointId-0'],
      fulfillAddresses: ['fulfillAddresses-0'],
      fulfillFunctionIds: ['fulfillFunctionId-0'],
      parameters: ['0x6874656d706c6174656576616c7565'],
      providerIds: ['providerId-0'],
      requesterInds: ['requesterIndex-0'],
    };
    getTemplatesMock.mockResolvedValueOnce(rawTemplates);

    const apiCalls = [
      fixtures.requests.createApiCall({ templateId: 'templateId-0' }),
      fixtures.requests.createApiCall({ templateId: 'templateId-0' }),
    ];

    const [logs, err, res] = await fetching.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(res).toEqual({
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        endpointId: 'endpointId-0',
        fulfillAddress: 'fulfillAddresses-0',
        fulfillFunctionId: 'fulfillFunctionId-0',
        providerId: 'providerId-0',
        requesterIndex: 'requesterIndex-0',
        templateId: 'templateId-0',
      },
    });

    expect(getTemplatesMock).toHaveBeenCalledTimes(1);
    expect(getTemplatesMock.mock.calls).toEqual([[['templateId-0']]]);
  });

  it('ignores API calls without a template ID', async () => {
    const apiCalls = [fixtures.requests.createApiCall({ templateId: null })];
    const [logs, err, res] = await fetching.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(res).toEqual({});
    expect(getTemplatesMock).not.toHaveBeenCalled();
  });

  it('retries once on failure', async () => {
    const rawTemplates = {
      designatedWallets: ['designatedWallet-0'],
      endpointIds: ['endpointId-0'],
      fulfillAddresses: ['fulfillAddresses-0'],
      fulfillFunctionIds: ['fulfillFunctionId-0'],
      parameters: ['0x6874656d706c6174656576616c7565'],
      providerIds: ['providerId-0'],
      requesterInds: ['requesterIndex-0'],
    };
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplatesMock.mockResolvedValueOnce(rawTemplates);

    const apiCalls = [fixtures.requests.createApiCall({ templateId: 'templateId-0' })];

    const [logs, err, res] = await fetching.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(res).toEqual({
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        endpointId: 'endpointId-0',
        fulfillAddress: 'fulfillAddresses-0',
        fulfillFunctionId: 'fulfillFunctionId-0',
        providerId: 'providerId-0',
        requesterIndex: 'requesterIndex-0',
        templateId: 'templateId-0',
      },
    });
    expect(getTemplatesMock).toHaveBeenCalledTimes(2);
  });

  it('retries a maximum of two times', async () => {
    const rawTemplates = {
      designatedWallets: ['designatedWallet-0'],
      endpointIds: ['endpointId-0'],
      providerIds: ['providerId-0'],
      fulfillAddresses: ['fulfillAddresses-0'],
      fulfillFunctionIds: ['fulfillFunctionId-0'],
      parameters: ['0x6874656d706c6174656576616c7565'],
      requesterInds: ['requesterIndex-0'],
    };
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));
    // This shouldn't be reached
    getTemplatesMock.mockResolvedValueOnce(rawTemplates);

    const apiCalls = [fixtures.requests.createApiCall({ templateId: 'templateId-0' })];

    const [logs, err, res] = await fetching.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch API call templates', error: new Error('Server says no') },
    ]);
    expect(err).toEqual(null);
    expect(res).toEqual({});
    expect(getTemplatesMock).toHaveBeenCalledTimes(2);
  });
});
