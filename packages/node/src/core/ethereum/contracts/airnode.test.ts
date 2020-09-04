import { Airnode } from './airnode';

describe('Airnode', () => {
  it('exposes the addresses for each network', () => {
    expect(Airnode.addresses).toEqual({
      1: '<TODO>',
      3: '<TODO>',
      1337: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    });
  });

  it('exposes the contract ABI events', () => {
    const events = Airnode.ABI.filter((fn: any) => fn.type === 'event')
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

    expect(Object.keys(Airnode.topics).sort()).toEqual([
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
    expect(Airnode.topics.ApiCallRequest).toEqual('0x74676e35c7aea7d314a29a1d492d5d8893a25cc42d1651aa8b28176f6ed1da00');
    expect(Airnode.topics.ApiCallShortRequest).toEqual(
      '0xcd6c768c11f2fbdd5198c9a5018f2f55674178a7b09acddb7db85df0990e4a4d'
    );
    expect(Airnode.topics.ApiCallFullRequest).toEqual(
      '0xdde8c10b801648ba2b9956ab598b0a173307f7535ffadf4c0b4e3817aa50b245'
    );
    expect(Airnode.topics.ApiCallFulfilledBytesSuccessful).toEqual(
      '0x99c3dc9fae9ea6e1e48e90bf434d9b64c4ebdb218f1a39f1752cccfa010c71e3'
    );
    expect(Airnode.topics.ApiCallFulfilledErrored).toEqual(
      '0x7900a73e75933ef0fb889469c195a115304017644f05c24ecd3194fb12a8cc00'
    );
    expect(Airnode.topics.ApiCallFulfilledFailed).toEqual(
      '0x8dfae166b9b592f19e4abff08df0c204461a5419c1233a86b233497bd5f559ef'
    );
    expect(Airnode.topics.ApiCallFulfilledSuccessful).toEqual(
      '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167'
    );

    // Wallet Designations
    expect(Airnode.topics.WalletDesignationFulfilled).toEqual(
      '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6'
    );
    expect(Airnode.topics.WalletDesignationRequest).toEqual(
      '0x54731539873419bbdf008e1d7a666aeed0a8e141953b2dd4ba187dba3981bfc3'
    );

    // Withdrawals
    expect(Airnode.topics.WithdrawalFulfilled).toEqual(
      '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439'
    );
    expect(Airnode.topics.WithdrawalRequested).toEqual(
      '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b'
    );
  });
});
