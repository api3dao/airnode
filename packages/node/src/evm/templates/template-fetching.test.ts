const getTemplateMock = jest.fn();
const getTemplatesMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      Contract: jest.fn().mockImplementation(() => ({
        getTemplate: getTemplateMock,
        getTemplates: getTemplatesMock,
      })),
    },
  };
});

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import * as templates from './template-fetching';

describe('fetch (templates)', () => {
  let fetchOptions: templates.FetchOptions;

  beforeEach(() => {
    fetchOptions = {
      airnodeAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
      convenienceAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
      provider: new ethers.providers.JsonRpcProvider(),
    };
  });

  it('fetches templates in groups of 10', async () => {
    const firstRawTemplates = {
      endpointIds: Array.from(Array(10).keys()).map((n) => `endpointId-${n}`),
      parameters: Array.from(Array(10).keys()).map(() => '0x6874656d706c6174656576616c7565'),
      providerIds: Array.from(Array(10).keys()).map((n) => `providerId-${n}`),
    };

    const secondRawTemplates = {
      endpointIds: Array.from(Array(9).keys()).map((n) => `endpointId-${n + 10}`),
      parameters: Array.from(Array(9).keys()).map(() => '0x6874656d706c6174656576616c7565'),
      providerIds: Array.from(Array(9).keys()).map((n) => `providerId-${n + 10}`),
    };

    getTemplatesMock.mockResolvedValueOnce(firstRawTemplates);
    getTemplatesMock.mockResolvedValueOnce(secondRawTemplates);

    const apiCalls = Array.from(Array(19).keys()).map((n) => {
      return fixtures.requests.createApiCall({
        id: `${n}`,
        templateId: `templateId-${n}`,
      });
    });

    const [logs, res] = await templates.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
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
      endpointIds: ['endpointId-0'],
      parameters: ['0x6874656d706c6174656576616c7565'],
      providerIds: ['providerId-0'],
    };
    getTemplatesMock.mockResolvedValueOnce(rawTemplates);

    const apiCall = fixtures.requests.createApiCall({ templateId: 'templateId-0' });
    const [logs, res] = await templates.fetch([apiCall], fetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({
      'templateId-0': {
        encodedParameters: '0x6874656d706c6174656576616c7565',
        endpointId: 'endpointId-0',
        providerId: 'providerId-0',
        id: 'templateId-0',
      },
    });
  });

  it('filters out duplicate template IDs', async () => {
    const rawTemplates = {
      endpointIds: ['endpointId-0'],
      parameters: ['0x6874656d706c6174656576616c7565'],
      providerIds: ['providerId-0'],
    };
    getTemplatesMock.mockResolvedValueOnce(rawTemplates);

    const apiCall = fixtures.requests.createApiCall({ templateId: 'templateId-0' });
    const apiCallDup = fixtures.requests.createApiCall({ templateId: 'templateId-0' });
    const [logs, res] = await templates.fetch([apiCall, apiCallDup], fetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({
      'templateId-0': {
        encodedParameters: '0x6874656d706c6174656576616c7565',
        endpointId: 'endpointId-0',
        id: 'templateId-0',
        providerId: 'providerId-0',
      },
    });

    expect(getTemplatesMock).toHaveBeenCalledTimes(1);
    expect(getTemplatesMock.mock.calls).toEqual([[['templateId-0']]]);
  });

  it('ignores API calls without a template ID', async () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: null });
    const [logs, res] = await templates.fetch([apiCall], fetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({});
    expect(getTemplatesMock).not.toHaveBeenCalled();
  });

  it('retries once on failure', async () => {
    const rawTemplates = {
      endpointIds: ['endpointId-0'],
      parameters: ['0x6874656d706c6174656576616c7565'],
      providerIds: ['providerId-0'],
    };
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplatesMock.mockResolvedValueOnce(rawTemplates);

    const apiCall = fixtures.requests.createApiCall({ templateId: 'templateId-0' });
    const [logs, res] = await templates.fetch([apiCall], fetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({
      'templateId-0': {
        encodedParameters: '0x6874656d706c6174656576616c7565',
        endpointId: 'endpointId-0',
        id: 'templateId-0',
        providerId: 'providerId-0',
      },
    });
    expect(getTemplatesMock).toHaveBeenCalledTimes(2);
  });

  it('fetches templates individually if the template group cannot be fetched', async () => {
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));

    const rawTemplate = {
      endpointId: 'endpointId-0',
      parameters: '0x6874656d706c6174656576616c7565',
      providerId: 'providerId-0',
    };
    getTemplateMock.mockResolvedValueOnce(rawTemplate);

    const apiCall = fixtures.requests.createApiCall({ templateId: 'templateId-0' });
    const [logs, res] = await templates.fetch([apiCall], fetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch API call templates', error: new Error('Server says no') },
      { level: 'INFO', message: `Fetched API call template:${apiCall.templateId}` },
    ]);
    expect(res).toEqual({
      'templateId-0': {
        encodedParameters: '0x6874656d706c6174656576616c7565',
        endpointId: 'endpointId-0',
        id: 'templateId-0',
        providerId: 'providerId-0',
      },
    });
    expect(getTemplatesMock).toHaveBeenCalledTimes(2);
    expect(getTemplateMock).toHaveBeenCalledTimes(1);
  });

  it('retries individual template calls once', async () => {
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));

    const rawTemplate = {
      endpointId: 'endpointId-0',
      parameters: '0x6874656d706c6174656576616c7565',
      providerId: 'providerId-0',
    };
    getTemplateMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplateMock.mockResolvedValueOnce(rawTemplate);

    const apiCall = fixtures.requests.createApiCall({ templateId: 'templateId-0' });
    const [logs, res] = await templates.fetch([apiCall], fetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch API call templates', error: new Error('Server says no') },
      { level: 'INFO', message: `Fetched API call template:${apiCall.templateId}` },
    ]);
    expect(res).toEqual({
      'templateId-0': {
        encodedParameters: '0x6874656d706c6174656576616c7565',
        endpointId: 'endpointId-0',
        id: 'templateId-0',
        providerId: 'providerId-0',
      },
    });
    expect(getTemplatesMock).toHaveBeenCalledTimes(2);
    expect(getTemplateMock).toHaveBeenCalledTimes(2);
  });

  it('returns nothing after all template calls are exhausted', async () => {
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplatesMock.mockRejectedValueOnce(new Error('Server says no'));

    getTemplateMock.mockRejectedValueOnce(new Error('Still no'));
    getTemplateMock.mockRejectedValueOnce(new Error('Still no'));

    const apiCall = fixtures.requests.createApiCall({ templateId: 'templateId-0' });
    const [logs, res] = await templates.fetch([apiCall], fetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch API call templates', error: new Error('Server says no') },
      {
        level: 'ERROR',
        message: `Failed to fetch API call template:${apiCall.templateId}`,
        error: new Error('Still no'),
      },
    ]);
    expect(res).toEqual({});
    expect(getTemplatesMock).toHaveBeenCalledTimes(2);
    expect(getTemplateMock).toHaveBeenCalledTimes(2);
  });
});

describe('fetchTemplate', () => {
  let airnode: ethers.Contract;

  beforeEach(() => {
    airnode = new ethers.Contract('address', ['ABI']);
  });

  it('fetches the individual template', async () => {
    const rawTemplate = {
      endpointId: 'endpointId-0',
      parameters: '0x6874656d706c6174656576616c7565',
      providerId: 'providerId-0',
    };
    getTemplateMock.mockResolvedValueOnce(rawTemplate);

    const templateId = 'templateId';
    const [logs, res] = await templates.fetchTemplate(airnode, templateId);
    expect(logs).toEqual([{ level: 'INFO', message: `Fetched API call template:${templateId}` }]);
    expect(res).toEqual({
      encodedParameters: '0x6874656d706c6174656576616c7565',
      endpointId: 'endpointId-0',
      id: templateId,
      providerId: 'providerId-0',
    });
    expect(getTemplateMock).toHaveBeenCalledTimes(1);
  });

  it('retries individual template calls once', async () => {
    const rawTemplate = {
      endpointId: 'endpointId-0',
      parameters: '0x6874656d706c6174656576616c7565',
      providerId: 'providerId-0',
    };
    getTemplateMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplateMock.mockResolvedValueOnce(rawTemplate);

    const templateId = 'templateId';
    const [logs, res] = await templates.fetchTemplate(airnode, templateId);
    expect(logs).toEqual([{ level: 'INFO', message: `Fetched API call template:${templateId}` }]);
    expect(res).toEqual({
      encodedParameters: '0x6874656d706c6174656576616c7565',
      endpointId: 'endpointId-0',
      id: templateId,
      providerId: 'providerId-0',
    });
    expect(getTemplateMock).toHaveBeenCalledTimes(2);
  });

  it('returns nothing after all individual template calls are exhausted', async () => {
    getTemplateMock.mockRejectedValueOnce(new Error('Server says no'));
    getTemplateMock.mockRejectedValueOnce(new Error('Server says no'));

    const templateId = 'templateId';
    const [logs, res] = await templates.fetchTemplate(airnode, templateId);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Failed to fetch API call template:${templateId}`,
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual(null);
    expect(getTemplateMock).toHaveBeenCalledTimes(2);
  });
});
