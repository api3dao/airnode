import { mockReadFileSync } from '../../test/mock-utils';
import * as validator from '@api3/airnode-validator';
import { PendingLog } from '@api3/airnode-utilities';
import * as local from './local-handlers';
import * as handlers from '../handlers';
import { scrub } from '../providers/state';
import * as fixtures from '../../test/fixtures';

describe('startCoordinator', () => {
  it('starts the coordinator', async () => {
    const config = fixtures.buildConfig();

    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

    // @ts-ignore
    jest.spyOn(handlers, 'startCoordinator').mockResolvedValue({});

    const res = await local.startCoordinator();
    expect(res).toEqual({ ok: true, data: { message: 'Coordinator completed' } });
  });
});

describe('initializeProvider', () => {
  it('returns the provider state', async () => {
    const config = fixtures.buildConfig();

    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

    const state = fixtures.buildEVMProviderState();
    jest.spyOn(handlers, 'initializeProvider').mockResolvedValue(state);

    const scrubbed = scrub(state);
    const logOptions = fixtures.buildLogOptions();
    const res = await local.initializeProvider({ state, functionName: 'initializeProvider', logOptions });
    expect(res).toEqual({ ok: true, data: scrubbed });
  });

  it('handles initialize provider errors', async () => {
    const config = fixtures.buildConfig();

    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

    const state = fixtures.buildEVMProviderState();
    const error = new Error('Something went wrong!');
    jest.spyOn(handlers, 'initializeProvider').mockRejectedValue(error);

    const errorLog: PendingLog = { level: 'ERROR', error, message: 'Failed to initialize provider:Ganache test' };
    const logOptions = fixtures.buildLogOptions();
    const res = await local.initializeProvider({ state, functionName: 'initializeProvider', logOptions });
    expect(res).toEqual({ ok: false, errorLog });
  });
});

describe('callApi', () => {
  it('returns the API response', async () => {
    const config = fixtures.buildConfig();

    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

    const callResponse = {
      success: true,
      data: {
        timestamp: 'some-timestamp',
        encodedValue: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
        signature: 'some-signature',
      },
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

    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

    const state = fixtures.buildEVMProviderSponsorState();
    jest.spyOn(handlers, 'processTransactions').mockResolvedValue(state);

    const scrubbed = scrub(state);
    const logOptions = fixtures.buildLogOptions();
    const res = await local.processTransactions({ state, functionName: 'processTransactions', logOptions });
    expect(res).toEqual({ ok: true, data: scrubbed });
  });

  it('handles process provider requests errors', async () => {
    const config = fixtures.buildConfig();

    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

    const state = fixtures.buildEVMProviderSponsorState();
    const error = new Error('Something went wrong!');
    jest.spyOn(handlers, 'processTransactions').mockRejectedValue(error);

    const errorLog: PendingLog = { level: 'ERROR', error, message: 'Failed to process provider requests:Ganache test' };
    const logOptions = fixtures.buildLogOptions();
    const res = await local.processTransactions({ state, functionName: 'processTransactions', logOptions });
    expect(res).toEqual({ ok: false, errorLog });
  });
});
