import * as events from './events';

describe('API call topics', () => {
  it('returns API_CALL_REQUEST_TOPICS', () => {
    expect(events.API_CALL_REQUEST_TOPICS).toEqual([
      '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b',
      '0xfcbcd5adb2d26ecd4ad50e6267e977fd479fcd0a6c82bde8eea85290ab3b46e6',
      '0x775e78a8e7375d14ad03d31edd0a27b29a055f732bca987abfe8082c16ed7e44',
    ]);
  });

  it('returns API_CALL_FULFILLED_TOPICS', () => {
    expect(events.API_CALL_FULFILLED_TOPICS).toEqual([
      '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5',
      '0x0ebeb9b9b5c4baf915e7541c7e0919dd1a58eb06ee596035a50d08d20b9219de',
      '0x1cfdd5ace64f15111ef8ed9df04364d0e9a9165cccf8386109347e54661ba3ad',
    ]);
  });
});

describe('Withdrawal topics', () => {
  it('returns WITHDRAWAL_REQUEST_TOPICS', () => {
    expect(events.WITHDRAWAL_REQUEST_TOPICS).toEqual([
      '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b',
    ]);
  });

  it('returns WITHDRAWAL_FULFILLED_TOPICS', () => {
    expect(events.WITHDRAWAL_FULFILLED_TOPICS).toEqual([
      '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439',
    ]);
  });
});

describe('isApiCallRequest', () => {
  it('returns true if the topic is an API call topic', () => {
    events.API_CALL_REQUEST_TOPICS.forEach((topic) => {
      const log: any = { topic };
      expect(events.isApiCallRequest(log)).toEqual(true);
    });
  });

  it('returns false if the topic is not an API call topic', () => {
    events.API_CALL_FULFILLED_TOPICS.forEach((topic) => {
      const log: any = { topic };
      expect(events.isApiCallRequest(log)).toEqual(false);
    });
  });
});

describe('isApiCallFulfillment', () => {
  it('returns true if the topic is an API call fulfillment topic', () => {
    events.API_CALL_FULFILLED_TOPICS.forEach((topic) => {
      const log: any = { topic };
      expect(events.isApiCallFulfillment(log)).toEqual(true);
    });
  });

  it('returns false if the topic is not an API call topic', () => {
    events.API_CALL_REQUEST_TOPICS.forEach((topic) => {
      const log: any = { topic };
      expect(events.isApiCallFulfillment(log)).toEqual(false);
    });
  });
});

describe('isWithdrawalRequest', () => {
  it('returns true if the topic is a withdrawal request topic', () => {
    events.WITHDRAWAL_REQUEST_TOPICS.forEach((topic) => {
      const log: any = { topic };
      expect(events.isWithdrawalRequest(log)).toEqual(true);
    });
  });

  it('returns false if the topic is not a withdrawal request topic', () => {
    events.WITHDRAWAL_FULFILLED_TOPICS.forEach((topic) => {
      const log: any = { topic };
      expect(events.isWithdrawalRequest(log)).toEqual(false);
    });
  });
});

describe('isWithdrawalFulfillment', () => {
  it('returns true if the topic is a withdrawal fulfillment topic', () => {
    events.WITHDRAWAL_FULFILLED_TOPICS.forEach((topic) => {
      const log: any = { topic };
      expect(events.isWithdrawalFulfillment(log)).toEqual(true);
    });
  });

  it('returns false if the topic is not a withdrawal fulfillment topic', () => {
    events.WITHDRAWAL_REQUEST_TOPICS.forEach((topic) => {
      const log: any = { topic };
      expect(events.isWithdrawalFulfillment(log)).toEqual(false);
    });
  });
});
