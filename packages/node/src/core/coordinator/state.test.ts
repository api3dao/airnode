import * as fixtures from 'test/fixtures';
import { AggregatedApiCallsById } from 'src/types';
import * as state from './state';

describe('create', () => {
  it('returns a new coordinator state object', () => {
    const settings = fixtures.createNodeSettings();
    const res = state.create(settings);
    expect(Object.keys(res).sort()).toEqual(['EVMProviders', 'aggregatedApiCallsById', 'id', 'settings']);
    expect(res.aggregatedApiCallsById).toEqual({});
    expect(res.EVMProviders).toEqual([]);
    expect(res.id.length).toEqual(16);
    expect(res.settings).toEqual(settings);
  });
});

describe('update', () => {
  it('updates and returns the new state', () => {
    const aggregatedApiCallsById: AggregatedApiCallsById = {
      apiCallId: fixtures.createAggregatedApiCall(),
    };
    const settings = fixtures.createNodeSettings();
    const newState = state.create(settings);
    const res = state.update(newState, { aggregatedApiCallsById });
    expect(Object.keys(res).sort()).toEqual(['EVMProviders', 'aggregatedApiCallsById', 'id', 'settings']);
    expect(res.aggregatedApiCallsById).toEqual({ apiCallId: fixtures.createAggregatedApiCall() });
    expect(res.EVMProviders).toEqual([]);
    expect(res.id.length).toEqual(16);
    expect(res.settings).toEqual(settings);
  });
});
