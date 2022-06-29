import * as state from './state';
import * as fixtures from '../../test/fixtures';
import { RegularAggregatedApiCallsById } from '../types';

describe('create', () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey(),
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns a new coordinator state object', () => {
    const config = fixtures.buildConfig();
    const res = state.create(config);
    expect(Object.keys(res).sort()).toEqual([
      'aggregatedApiCallsById',
      'config',
      'coordinatorId',
      'providerStates',
      'settings',
    ]);
    expect(res.aggregatedApiCallsById).toEqual({});
    expect(res.providerStates).toEqual({ evm: [] });
    expect(res.coordinatorId.length).toEqual(16);
    expect(res.config).toEqual(config);
  });
});

describe('update', () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey(),
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('updates and returns the new state', () => {
    const aggregatedApiCallsById: RegularAggregatedApiCallsById = {
      apiCallId: fixtures.buildAggregatedRegularApiCall(),
    };
    const config = fixtures.buildConfig();
    const newState = state.create(config);
    const res = state.update(newState, { aggregatedApiCallsById });
    expect(Object.keys(res).sort()).toEqual([
      'aggregatedApiCallsById',
      'config',
      'coordinatorId',
      'providerStates',
      'settings',
    ]);
    expect(res.aggregatedApiCallsById).toEqual({ apiCallId: fixtures.buildAggregatedRegularApiCall() });
    expect(res.providerStates).toEqual({ evm: [] });
    expect(res.coordinatorId.length).toEqual(16);
    expect(res.config).toEqual(config);
  });
});
