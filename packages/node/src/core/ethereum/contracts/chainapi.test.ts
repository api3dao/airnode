import { ChainAPI } from './chainapi';

describe('ChainAPI', () => {
  it('exposes the addresses for each network', () => {
    expect(ChainAPI.addresses).toEqual({
      1: '<TODO>',
      3: '<TODO>',
    });
  });

  it('exposes the contract ABI events', () => {
    const events = ChainAPI.ABI.filter((fn: any) => fn.type === 'event').map((fn: any) => fn.name);
    expect(events).toEqual([
      'ClientDisendorsed',
      'ClientEndorsed',
      'EndpointCreated',
      'EndpointUpdated',
      'FulfillmentBytesSuccessful',
      'FulfillmentErrored',
      'FulfillmentFailed',
      'FulfillmentSuccessful',
      'FullRequestMade',
      'ProviderCreated',
      'ProviderKeysInitialized',
      'ProviderUpdated',
      'ProviderWalletAuthorized',
      'ProviderWalletReserved',
      'RequestMade',
      'RequesterCreated',
      'RequesterUpdated',
      'ShortRequestMade',
      'TemplateCreated',
      'WithdrawFulfilled',
      'WithdrawRequested',
    ]);
  });

  it('exposes the contract topics', () => {
    // Make sure all topics are covered
    expect.assertions(9);

    expect(Object.keys(ChainAPI.topics).sort()).toEqual([
      'FulfillmentBytesSuccessful',
      'FulfillmentErrored',
      'FulfillmentFailed',
      'FulfillmentSuccessful',
      'FullRequestMade',
      'RequestMade',
      'WithdrawFulfilled',
      'WithdrawRequested',
    ]);

    expect(ChainAPI.topics.FulfillmentBytesSuccessful).toEqual('0x99c3dc9fae9ea6e1e48e90bf434d9b64c4ebdb218f1a39f1752cccfa010c71e3');
    expect(ChainAPI.topics.FulfillmentErrored).toEqual('0x7900a73e75933ef0fb889469c195a115304017644f05c24ecd3194fb12a8cc00');
    expect(ChainAPI.topics.FulfillmentFailed).toEqual('0x8dfae166b9b592f19e4abff08df0c204461a5419c1233a86b233497bd5f559ef');
    expect(ChainAPI.topics.FulfillmentSuccessful).toEqual('0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167');
    expect(ChainAPI.topics.FullRequestMade).toEqual('0xcc16afda5deb199fd8f8fd4e020759442c86c50d17b076e5860480f358723f57');
    expect(ChainAPI.topics.RequestMade).toEqual('0x0efe0898971ca4a4ada014b6e46a0c04976f25a5b6f420bd9d368a2c67578f0b');
    expect(ChainAPI.topics.WithdrawFulfilled).toEqual('0x084726378542eff0a6413e6eedb6ee4a0627af74e550b735ad448acede3165fc');
    expect(ChainAPI.topics.WithdrawRequested).toEqual('0x807501b4a176d068b18e979406a05a3f7d8af479ad2a683f53902fda520a9a0a');
  });
});
