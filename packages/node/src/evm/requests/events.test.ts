import * as events from './events';

describe('API call topics', () => {
  it('returns API_CALL_REQUEST_TOPICS', () => {
    expect(events.API_CALL_REQUEST_TOPICS).toEqual([
      '0x8339fddbb81e588a9ed04dec82ee9ae6c7a185f44835adaaa2ace50ce3a14aaf',
      '0xe8ae99161b1547fd1c6ff3cb9660293fa4cd770fd52f72ff0362d64d8bccc08e',
    ]);
  });

  it('returns API_CALL_FULFILLED_TOPICS', () => {
    expect(events.API_CALL_FULFILLED_TOPICS).toEqual([
      '0xcde46e28d8d3e348e5f5b4fcc511fe3b1f9b0f549cd8332f0da31802a6f2bf61',
      '0x1cfdd5ace64f15111ef8ed9df04364d0e9a9165cccf8386109347e54661ba3ad',
    ]);
  });
});

describe('Withdrawal topics', () => {
  it('returns WITHDRAWAL_REQUEST_TOPICS', () => {
    expect(events.WITHDRAWAL_REQUEST_TOPICS).toEqual([
      '0x3d0ebccb4fc9730699221da0180970852f595ed5c78781346149123cbbe9f1d3',
    ]);
  });

  it('returns WITHDRAWAL_FULFILLED_TOPICS', () => {
    expect(events.WITHDRAWAL_FULFILLED_TOPICS).toEqual([
      '0x9e7b58b29aa3b972bb0f457499d0dfd00bf23905b0c3358fb864e7120402aefa',
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
