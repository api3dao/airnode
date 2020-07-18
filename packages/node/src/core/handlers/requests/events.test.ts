import * as events from './events';

describe('API call topics', () => {
  it('returns API_CALL_TOPICS', () => {
    expect(events.API_CALL_TOPICS).toEqual([
      '0x0efe0898971ca4a4ada014b6e46a0c04976f25a5b6f420bd9d368a2c67578f0b',
      '0xcc16afda5deb199fd8f8fd4e020759442c86c50d17b076e5860480f358723f57',
    ]);
  });

  it('returns API_CALL_FULFILLMENT_TOPICS', () => {
    expect(events.API_CALL_FULFILLMENT_TOPICS).toEqual([
      '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167',
      '0x99c3dc9fae9ea6e1e48e90bf434d9b64c4ebdb218f1a39f1752cccfa010c71e3',
      '0x7900a73e75933ef0fb889469c195a115304017644f05c24ecd3194fb12a8cc00',
      '0x8dfae166b9b592f19e4abff08df0c204461a5419c1233a86b233497bd5f559ef',
    ]);
  });
});

describe('Withdrawal topics', () => {
  it('returns WITHDRAWAL_TOPICS', () => {
    expect(events.WITHDRAWAL_TOPICS).toEqual(['0x807501b4a176d068b18e979406a05a3f7d8af479ad2a683f53902fda520a9a0a']);
  });

  it('returns WITHDRAWAL_FULFILLMENT_TOPICS', () => {
    expect(events.WITHDRAWAL_FULFILLMENT_TOPICS).toEqual([
      '0x084726378542eff0a6413e6eedb6ee4a0627af74e550b735ad448acede3165fc',
    ]);
  });
});

describe('isApiCallEvent', () => {
  it('returns true if the topic is an API call topic', () => {
    const log: any = { topic: '0x0efe0898971ca4a4ada014b6e46a0c04976f25a5b6f420bd9d368a2c67578f0b' };
    expect(events.isApiCallEvent(log)).toEqual(true);
  });

  it('returns false if the topic is not an API call topic', () => {
    const log: any = { topic: '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167' };
    expect(events.isApiCallEvent(log)).toEqual(false);
  });
});

describe('isApiCallFulfillmentEvent', () => {
  it('returns true if the topic is an API call fulfillment topic', () => {
    const log: any = { topic: '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167' };
    expect(events.isApiCallFulfillmentEvent(log)).toEqual(true);
  });

  it('returns false if the topic is not an API call topic', () => {
    const log: any = { topic: '0x0efe0898971ca4a4ada014b6e46a0c04976f25a5b6f420bd9d368a2c67578f0b' };
    expect(events.isApiCallFulfillmentEvent(log)).toEqual(false);
  });
});

describe('isWithdrawalEvent', () => {
  it('returns true if the topic is a withdrawal topic', () => {
    const log: any = { topic: '0x807501b4a176d068b18e979406a05a3f7d8af479ad2a683f53902fda520a9a0a' };
    expect(events.isWithdrawalEvent(log)).toEqual(true);
  });

  it('returns false if the topic is not a withdrawal topic', () => {
    const log: any = { topic: '0x084726378542eff0a6413e6eedb6ee4a0627af74e550b735ad448acede3165fc' };
    expect(events.isWithdrawalEvent(log)).toEqual(false);
  });
});

describe('isWithdrawalEvent', () => {
  it('returns true if the topic is a withdrawal topic', () => {
    const log: any = { topic: '0x084726378542eff0a6413e6eedb6ee4a0627af74e550b735ad448acede3165fc' };
    expect(events.isWithdrawalFulfillmentEvent(log)).toEqual(true);
  });

  it('returns false if the topic is not an API call topic', () => {
    const log: any = { topic: '0x807501b4a176d068b18e979406a05a3f7d8af479ad2a683f53902fda520a9a0a' };
    expect(events.isWithdrawalFulfillmentEvent(log)).toEqual(false);
  });
});
