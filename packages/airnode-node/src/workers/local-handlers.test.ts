import fs from 'fs';
import * as validator from '@api3/airnode-validator';
import * as local from './local-handlers';
import * as handlers from '../handlers';
import { scrub } from '../providers/state';
import { PendingLog } from '../types';
import * as fixtures from '../../test/fixtures';

describe('startCoordinator', () => {
  it('starts the coordinator', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });

    // @ts-ignore
    jest.spyOn(handlers, 'startCoordinator').mockResolvedValue({});

    const res = await local.startCoordinator();
    expect(res).toEqual({ ok: true, data: { message: 'Coordinator completed' } });
  });
});

describe('initializeProvider', () => {
  it('returns the provider state', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });

    const state = fixtures.buildEVMProviderState();
    jest.spyOn(handlers, 'initializeProvider').mockResolvedValue(state);

    const scrubbed = scrub(state);
    const res = await local.initializeProvider({ state, functionName: 'initializeProvider' });
    expect(res).toEqual({ ok: true, data: scrubbed });
  });

  it('handles initialize provider errors', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });

    const state = fixtures.buildEVMProviderState();
    const error = new Error('Something went wrong!');
    jest.spyOn(handlers, 'initializeProvider').mockRejectedValue(error);

    const errorLog: PendingLog = { level: 'ERROR', error, message: 'Failed to initialize provider:Ganache test' };
    const res = await local.initializeProvider({ state, functionName: 'initializeProvider' });
    expect(res).toEqual({ ok: false, errorLog });
  });
});

describe('callApi', () => {
  it('returns the API response', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });

    const callResponse = {
      success: true,
      value: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
      signature: 'not used',
    } as const;
    jest.spyOn(handlers, 'callApi').mockResolvedValue([[], callResponse]);

    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall();
    const logOptions = fixtures.buildLogOptions();
    const res = await local.callApi({ aggregatedApiCall, logOptions, functionName: 'callApi' });
    expect(res).toEqual({ ok: true, data: callResponse });
  });
});

describe('processTransactions', () => {
  it('processes provider requests', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });

    const state = fixtures.buildEVMProviderSponsorState();
    jest.spyOn(handlers, 'processTransactions').mockResolvedValue(state);

    const scrubbed = scrub(state);
    const res = await local.processTransactions({ state, functionName: 'processTransactions' });
    expect(res).toEqual({ ok: true, data: scrubbed });
  });

  it('handles process provider requests errors', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });

    const state = fixtures.buildEVMProviderSponsorState();
    const error = new Error('Something went wrong!');
    jest.spyOn(handlers, 'processTransactions').mockRejectedValue(error);

    const errorLog: PendingLog = { level: 'ERROR', error, message: 'Failed to process provider requests:Ganache test' };
    const res = await local.processTransactions({ state, functionName: 'processTransactions' });
    expect(res).toEqual({ ok: false, errorLog });
  });
});
