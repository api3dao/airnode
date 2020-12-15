import {
  API_CALL_TIMEOUT,
  API_CALL_TOTAL_TIMEOUT,
  BLOCK_COUNT_HISTORY_LIMIT,
  BLOCK_COUNT_IGNORE_LIMIT,
  BLOCK_MIN_CONFIRMATIONS,
  CONVENIENCE_BATCH_SIZE,
  DEFAULT_RETRY_OPERATION_TIMEOUT,
  EVM_PROVIDER_TIMEOUT,
  GAS_LIMIT,
  OPERATION_RETRIES,
  PROVIDER_INITIALIZATION_TIMEOUT,
  WORKER_CALL_API_TIMEOUT,
} from './constants';

describe('constants', () => {
  it('returns constant API_CALL_TOTAL_TIMEOUT value', () => {
    expect(API_CALL_TOTAL_TIMEOUT).toEqual(29_000);
  });
  it('returns constant API_CALL_TIMEOUT value', () => {
    expect(API_CALL_TIMEOUT).toEqual(20_000);
  });
  it('returns constant BLOCK_COUNT_HISTORY_LIMIT value', () => {
    expect(BLOCK_COUNT_HISTORY_LIMIT).toEqual(600);
  });
  it('returns constant BLOCK_COUNT_IGNORE_LIMIT value', () => {
    expect(BLOCK_COUNT_IGNORE_LIMIT).toEqual(20);
  });
  it('returns constant BLOCK_MIN_CONFIRMATIONS value', () => {
    expect(BLOCK_MIN_CONFIRMATIONS).toEqual(0);
  });
  it('returns constant CONVENIENCE_BATCH_SIZE value', () => {
    expect(CONVENIENCE_BATCH_SIZE).toEqual(10);
  });
  it('returns constant DEFAULT_RETRY_OPERATION_TIMEOUT value', () => {
    expect(DEFAULT_RETRY_OPERATION_TIMEOUT).toEqual(5000);
  });
  it('returns constant EVM_PROVIDER_TIMEOUT value', () => {
    expect(EVM_PROVIDER_TIMEOUT).toEqual(10_000);
  });
  it('returns constant GAS_LIMIT value', () => {
    expect(GAS_LIMIT).toEqual(500_000);
  });
  it('returns constant OPERATION_RETRIES value', () => {
    expect(OPERATION_RETRIES).toEqual(2);
  });
  it('returns constant PROVIDER_INITIALIZATION_TIMEOUT value', () => {
    expect(PROVIDER_INITIALIZATION_TIMEOUT).toEqual(20_000);
  });
  it('returns constant WORKER_CALL_API_TIMEOUT value', () => {
    expect(WORKER_CALL_API_TIMEOUT).toEqual(29_500);
  });
});
