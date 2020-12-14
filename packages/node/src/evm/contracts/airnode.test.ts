import { Airnode } from './airnode';
import { AirnodeAddresses } from '@airnode/protocol';

describe('Airnode', () => {
  it('exposes the addresses for each network', () => {
    expect(Airnode.addresses).toEqual({
      1: '<TODO>',
      3: AirnodeAddresses[3],
      4: AirnodeAddresses[4],
      1337: '0x197F3826040dF832481f835652c290aC7c41f073',
    });
  });

  it('exposes the contract ABI events', () => {
    const events = Airnode.ABI.filter((fn: any) => fn.type === 'event')
      .map((fn: any) => fn.name)
      .sort();
    expect(events).toEqual([
      'ClientEndorsementStatusUpdated',
      'ClientFullRequestCreated',
      'ClientRequestCreated',
      'ClientRequestFailed',
      'ClientRequestFulfilled',
      'ClientRequestFulfilledWithBytes',
      'ClientShortRequestCreated',
      'EndpointUpdated',
      'ProviderCreated',
      'ProviderUpdated',
      'RequesterCreated',
      'RequesterUpdated',
      'TemplateCreated',
      'WithdrawalFulfilled',
      'WithdrawalRequested',
    ]);
  });

  it('exposes the contract topics', () => {
    // Make sure all topics are covered
    expect.assertions(9);

    expect(Object.keys(Airnode.topics).sort()).toEqual([
      'ClientFullRequestCreated',
      'ClientRequestCreated',
      'ClientRequestFailed',
      'ClientRequestFulfilled',
      'ClientRequestFulfilledWithBytes',
      'ClientShortRequestCreated',
      'WithdrawalFulfilled',
      'WithdrawalRequested',
    ]);

    // API calls
    expect(Airnode.topics.ClientRequestCreated).toEqual(
      '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b'
    );
    expect(Airnode.topics.ClientShortRequestCreated).toEqual(
      '0xfcbcd5adb2d26ecd4ad50e6267e977fd479fcd0a6c82bde8eea85290ab3b46e6'
    );
    expect(Airnode.topics.ClientFullRequestCreated).toEqual(
      '0x775e78a8e7375d14ad03d31edd0a27b29a055f732bca987abfe8082c16ed7e44'
    );

    expect(Airnode.topics.ClientRequestFulfilled).toEqual(
      '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5'
    );
    expect(Airnode.topics.ClientRequestFulfilledWithBytes).toEqual(
      '0x0ebeb9b9b5c4baf915e7541c7e0919dd1a58eb06ee596035a50d08d20b9219de'
    );
    expect(Airnode.topics.ClientRequestFailed).toEqual(
      '0x1cfdd5ace64f15111ef8ed9df04364d0e9a9165cccf8386109347e54661ba3ad'
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
