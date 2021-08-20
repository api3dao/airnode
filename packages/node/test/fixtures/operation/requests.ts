import { ReservedParameterName } from '@api3/ois';
import { FullRequest, RegularRequest, Withdrawal } from '@api3/operation';

export function buildRegularRequest(overrides?: Partial<RegularRequest>): RegularRequest {
  return {
    requesterId: 'bob',
    type: 'regular',
    airnode: 'CurrencyConverterAirnode',
    template: 'template-1',
    client: 'MockAirnodeRrpClientFactory',
    fulfillFunctionName: 'fulfill',
    parameters: [{ type: 'bytes32', name: 'from', value: 'ETH' }],
    ...overrides,
  };
}

export function buildFullRequest(overrides?: Partial<FullRequest>): FullRequest {
  return {
    requesterId: 'bob',
    type: 'full',
    airnode: 'CurrencyConverterAirnode',
    endpoint: 'convertToUSD',
    oisTitle: 'Currency Converter API',
    client: 'MockAirnodeRrpClientFactory',
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

export function buildWithdrawal(overrides?: Partial<Withdrawal>): Withdrawal {
  return {
    requesterId: 'alice',
    type: 'withdrawal',
    airnode: 'CurrencyConverterAirnode',
    ...overrides,
  };
}
