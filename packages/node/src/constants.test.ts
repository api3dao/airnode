import * as constants from './constants';

describe('constants', () => {
  it('returns constant values', () => {
    const constCount = Object.keys(constants).length;

    // Ensure all constant values are checked
    expect.assertions(constCount + 1);
    expect(Object.keys(constants).length).toEqual(11);

    expect(constants.API_CALL_TIMEOUT).toEqual(20_000);
    expect(constants.API_CALL_TOTAL_TIMEOUT).toEqual(29_000);
    expect(constants.BLOCK_COUNT_HISTORY_LIMIT).toEqual(300);
    expect(constants.BLOCK_COUNT_IGNORE_LIMIT).toEqual(20);
    expect(constants.BLOCK_MIN_CONFIRMATIONS).toEqual(0);
    expect(constants.CONVENIENCE_BATCH_SIZE).toEqual(10);
    expect(constants.DEFAULT_RETRY_OPERATION_TIMEOUT).toEqual(5000);
    expect(constants.EVM_PROVIDER_TIMEOUT).toEqual(10_000);
    expect(constants.OPERATION_RETRIES).toEqual(2);
    expect(constants.WORKER_CALL_API_TIMEOUT).toEqual(29_500);
    expect(constants.WORKER_PROVIDER_INITIALIZATION_TIMEOUT).toEqual(20_000);
  });
});
