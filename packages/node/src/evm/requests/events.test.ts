import * as events from './events';

describe('API call topics', () => {
  it('returns API_CALL_REQUEST_TOPICS', () => {
    expect(events.API_CALL_REQUEST_TOPICS).toEqual([
      '0xeb39930cdcbb560e6422558a2468b93a215af60063622e63cbb165eba14c3203',
      '0x3a52c462346de2e9436a3868970892956828a11b9c43da1ed43740b12e1125ae',
    ]);
  });

  it('returns API_CALL_FULFILLED_TOPICS', () => {
    expect(events.API_CALL_FULFILLED_TOPICS).toEqual([
      '0xc0977dab79883641ece94bb6a932ca83049f561ffff8d8daaeafdbc1acce9e0a',
      '0xc7143b2270cddda57e0087ca5e2a4325657dcab10d10f6b1f9d5ce6b41cb97fc',
    ]);
  });
});

describe('Withdrawal topics', () => {
  it('returns WITHDRAWAL_REQUEST_TOPICS', () => {
    expect(events.WITHDRAWAL_REQUEST_TOPICS).toEqual([
      '0xd48d52c7c6d0c940f3f8d07591e1800ef3a70daf79929a97ccd80b4494769fc7',
    ]);
  });

  it('returns WITHDRAWAL_FULFILLED_TOPICS', () => {
    expect(events.WITHDRAWAL_FULFILLED_TOPICS).toEqual([
      '0xadb4840bbd5f924665ae7e0e0c83de5c0fb40a98c9b57dba53a6c978127a622e',
    ]);
  });
});

describe('isApiCallRequest', () => {
  it('returns true if the topic is an API call topic', () => {
    events.API_CALL_REQUEST_TOPICS.forEach((topic) => {
      const log: any = { parsedLog: { topic } };
      expect(events.isApiCallRequest(log)).toEqual(true);
    });
  });

  it('returns false if the topic is not an API call topic', () => {
    events.API_CALL_FULFILLED_TOPICS.forEach((topic) => {
      const log: any = { parsedLog: { topic } };
      expect(events.isApiCallRequest(log)).toEqual(false);
    });
  });
});

describe('isApiCallFulfillment', () => {
  it('returns true if the topic is an API call fulfillment topic', () => {
    events.API_CALL_FULFILLED_TOPICS.forEach((topic) => {
      const log: any = { parsedLog: { topic } };
      expect(events.isApiCallFulfillment(log)).toEqual(true);
    });
  });

  it('returns false if the topic is not an API call topic', () => {
    events.API_CALL_REQUEST_TOPICS.forEach((topic) => {
      const log: any = { parsedLog: { topic } };
      expect(events.isApiCallFulfillment(log)).toEqual(false);
    });
  });
});

describe('isWithdrawalRequest', () => {
  it('returns true if the topic is a withdrawal request topic', () => {
    events.WITHDRAWAL_REQUEST_TOPICS.forEach((topic) => {
      const log: any = { parsedLog: { topic } };
      expect(events.isWithdrawalRequest(log)).toEqual(true);
    });
  });

  it('returns false if the topic is not a withdrawal request topic', () => {
    events.WITHDRAWAL_FULFILLED_TOPICS.forEach((topic) => {
      const log: any = { parsedLog: { topic } };
      expect(events.isWithdrawalRequest(log)).toEqual(false);
    });
  });
});

describe('isWithdrawalFulfillment', () => {
  it('returns true if the topic is a withdrawal fulfillment topic', () => {
    events.WITHDRAWAL_FULFILLED_TOPICS.forEach((topic) => {
      const log: any = { parsedLog: { topic } };
      expect(events.isWithdrawalFulfillment(log)).toEqual(true);
    });
  });

  it('returns false if the topic is not a withdrawal fulfillment topic', () => {
    events.WITHDRAWAL_REQUEST_TOPICS.forEach((topic) => {
      const log: any = { parsedLog: { topic } };
      expect(events.isWithdrawalFulfillment(log)).toEqual(false);
    });
  });
});
