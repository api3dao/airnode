import * as events from './events';

describe('API call topics', () => {
  it('returns API_CALL_REQUEST_TOPICS', () => {
    expect(events.API_CALL_REQUEST_TOPICS).toEqual([
      '0x74676e35c7aea7d314a29a1d492d5d8893a25cc42d1651aa8b28176f6ed1da00',
      '0xcd6c768c11f2fbdd5198c9a5018f2f55674178a7b09acddb7db85df0990e4a4d',
      '0xdde8c10b801648ba2b9956ab598b0a173307f7535ffadf4c0b4e3817aa50b245',
    ]);
  });

  it('returns API_CALL_FULFILLED_TOPICS', () => {
    expect(events.API_CALL_FULFILLED_TOPICS).toEqual([
      '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167',
      '0x99c3dc9fae9ea6e1e48e90bf434d9b64c4ebdb218f1a39f1752cccfa010c71e3',
      '0x7900a73e75933ef0fb889469c195a115304017644f05c24ecd3194fb12a8cc00',
      '0x8dfae166b9b592f19e4abff08df0c204461a5419c1233a86b233497bd5f559ef',
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
    const log: any = { topic: '0x74676e35c7aea7d314a29a1d492d5d8893a25cc42d1651aa8b28176f6ed1da00' };
    expect(events.isApiCallRequest(log)).toEqual(true);
  });

  it('returns false if the topic is not an API call topic', () => {
    const log: any = { topic: '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167' };
    expect(events.isApiCallRequest(log)).toEqual(false);
  });
});

describe('isApiCallFulfillment', () => {
  it('returns true if the topic is an API call fulfillment topic', () => {
    const log: any = { topic: '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167' };
    expect(events.isApiCallFulfillment(log)).toEqual(true);
  });

  it('returns false if the topic is not an API call topic', () => {
    const log: any = { topic: '0x0efe0898971ca4a4ada014b6e46a0c04976f25a5b6f420bd9d368a2c67578f0b' };
    expect(events.isApiCallFulfillment(log)).toEqual(false);
  });
});

describe('isWithdrawalRequest', () => {
  it('returns true if the topic is a withdrawal request topic', () => {
    const log: any = { topic: '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b' };
    expect(events.isWithdrawalRequest(log)).toEqual(true);
  });

  it('returns false if the topic is not a withdrawal request topic', () => {
    const log: any = { topic: '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439' };
    expect(events.isWithdrawalRequest(log)).toEqual(false);
  });
});

describe('isWithdrawalFulfillment', () => {
  it('returns true if the topic is a withdrawal fulfillment topic', () => {
    const log: any = { topic: '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439' };
    expect(events.isWithdrawalFulfillment(log)).toEqual(true);
  });

  it('returns false if the topic is not a withdrawal fulfillment topic', () => {
    const log: any = { topic: '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b' };
    expect(events.isWithdrawalFulfillment(log)).toEqual(false);
  });
});
