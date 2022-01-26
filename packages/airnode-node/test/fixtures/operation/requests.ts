import { FullRequest, TemplateRequest, Request } from '@api3/airnode-operation';

export function buildTemplateRequest(overrides?: Partial<TemplateRequest>): TemplateRequest {
  return {
    sponsorId: 'bob',
    type: 'template',
    airnode: 'CurrencyConverterAirnode',
    template: 'template-1',
    requester: 'MockRrpRequesterFactory',
    fulfillFunctionName: 'fulfill',
    parameters: [{ type: 'string32', name: 'from', value: 'ETH' }],
    ...overrides,
  };
}

export function buildFullRequest(overrides?: Partial<FullRequest>): FullRequest {
  return {
    sponsorId: 'bob',
    type: 'full',
    airnode: 'CurrencyConverterAirnode',
    endpoint: 'convertToUSD',
    oisTitle: 'Currency Converter API',
    requester: 'MockRrpRequesterFactory',
    fulfillFunctionName: 'fulfill',
    parameters: [
      { type: 'string32', name: 'from', value: 'ETH' },
      { type: 'string32', name: 'to', value: 'USD' },
      { type: 'string32', name: '_type', value: 'int256' },
      { type: 'string32', name: '_path', value: 'result' },
      { type: 'string32', name: '_times', value: '100000' },
    ],
    ...overrides,
  };
}

export function buildWithdrawal(overrides?: Partial<Request>): Request {
  return {
    sponsorId: 'alice',
    type: 'withdrawal',
    airnode: 'CurrencyConverterAirnode',
    ...overrides,
  };
}
