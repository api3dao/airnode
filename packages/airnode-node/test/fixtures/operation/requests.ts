import { ReservedParameterName } from '@api3/airnode-ois';
import { FullRequest, TemplateRequest, Request } from '@api3/airnode-operation';

export function buildTemplateRequest(overrides?: Partial<TemplateRequest>): TemplateRequest {
  return {
    sponsorId: 'bob',
    type: 'template',
    airnode: 'CurrencyConverterAirnode',
    template: 'template-1',
    requester: 'MockRrpRequesterFactory',
    fulfillFunctionName: 'fulfill',
    parameters: [{ type: 'bytes32', name: 'from', value: 'ETH' }],
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
      { type: 'bytes32', name: 'from', value: 'ETH' },
      { type: 'bytes32', name: 'to', value: 'USD' },
      { type: 'bytes32', name: ReservedParameterName.Type, value: 'int256' },
      { type: 'bytes32', name: ReservedParameterName.Path, value: 'result' },
      { type: 'bytes32', name: ReservedParameterName.Times, value: '100000' },
      { type: 'bytes32', name: ReservedParameterName.RelayMetadata, value: 'v1' },
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
