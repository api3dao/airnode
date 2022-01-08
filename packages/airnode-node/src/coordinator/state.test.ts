import * as state from './state';
import * as fixtures from '../../test/fixtures';
import { AggregatedApiCallsById } from '../types';

describe('create', () => {
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
  it('updates and returns the new state', () => {
    const aggregatedApiCallsById: AggregatedApiCallsById = {
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
