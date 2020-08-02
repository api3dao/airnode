import { ChainAPI } from './chainapi';

describe('ChainAPI', () => {
  it('exposes the addresses for each network', () => {
    const chainIds = Object.keys(ChainAPI.addresses).sort();
    expect(chainIds).toEqual(['1', '1337', '3']);

    // We don't care what the value of 1337 is set to
    expect.assertions(chainIds.length);

    expect(ChainAPI.addresses[1]).toEqual('<TODO>');
    expect(ChainAPI.addresses[3]).toEqual('<TODO>');
  });

  it('exposes the contract ABI events', () => {
    const events = ChainAPI.ABI.filter((fn: any) => fn.type === 'event')
      .map((fn: any) => fn.name)
      .sort();
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
      'RequestMade',
      'RequesterCreated',
      'RequesterUpdated',
      'ShortRequestMade',
      'TemplateCreated',
      'WalletDesignationFulfilled',
      'WalletDesignationRequested',
      'WithdrawalFulfilled',
      'WithdrawalRequested',
    ]);
  });

  it('exposes the contract topics', () => {
    // Make sure all topics are covered
    expect.assertions(12);

    expect(Object.keys(ChainAPI.topics).sort()).toEqual([
      'ApiCallFulfilledBytesSuccessful',
      'ApiCallFulfilledErrored',
      'ApiCallFulfilledFailed',
      'ApiCallFulfilledSuccessful',
      'ApiCallFullRequest',
      'ApiCallRequest',
      'ApiCallShortRequest',
      'WalletDesignationFulfilled',
      'WalletDesignationRequest',
      'WithdrawalFulfilled',
      'WithdrawalRequested',
    ]);

    // API calls
    expect(ChainAPI.topics.ApiCallRequest).toEqual('0x74676e35c7aea7d314a29a1d492d5d8893a25cc42d1651aa8b28176f6ed1da00');
    expect(ChainAPI.topics.ApiCallShortRequest).toEqual(
      '0xcd6c768c11f2fbdd5198c9a5018f2f55674178a7b09acddb7db85df0990e4a4d'
    );
    expect(ChainAPI.topics.ApiCallFullRequest).toEqual(
      '0xdde8c10b801648ba2b9956ab598b0a173307f7535ffadf4c0b4e3817aa50b245'
    );
    expect(ChainAPI.topics.ApiCallFulfilledBytesSuccessful).toEqual(
      '0x99c3dc9fae9ea6e1e48e90bf434d9b64c4ebdb218f1a39f1752cccfa010c71e3'
    );
    expect(ChainAPI.topics.ApiCallFulfilledErrored).toEqual(
      '0x7900a73e75933ef0fb889469c195a115304017644f05c24ecd3194fb12a8cc00'
    );
    expect(ChainAPI.topics.ApiCallFulfilledFailed).toEqual(
      '0x8dfae166b9b592f19e4abff08df0c204461a5419c1233a86b233497bd5f559ef'
    );
    expect(ChainAPI.topics.ApiCallFulfilledSuccessful).toEqual(
      '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167'
    );

    // Wallet Designations
    expect(ChainAPI.topics.WalletDesignationFulfilled).toEqual(
      '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6'
    );
    expect(ChainAPI.topics.WalletDesignationRequest).toEqual(
      '0x54731539873419bbdf008e1d7a666aeed0a8e141953b2dd4ba187dba3981bfc3'
    );

    // Withdrawals
    expect(ChainAPI.topics.WithdrawalFulfilled).toEqual(
      '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439'
    );
    expect(ChainAPI.topics.WithdrawalRequested).toEqual(
      '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b'
    );
  });
});
