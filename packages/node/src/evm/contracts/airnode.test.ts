import { Airnode } from './airnode';

describe('Airnode', () => {
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
      'ProviderCreated',
      'RequesterCreated',
      'RequesterUpdated',
      'TemplateCreated',
      'WithdrawalFulfilled',
      'WithdrawalRequested',
    ]);
  });

  it('exposes the contract topics', () => {
    // Make sure all topics are covered
    expect.assertions(7);

    expect(Object.keys(Airnode.topics).sort()).toEqual([
      'ClientFullRequestCreated',
      'ClientRequestCreated',
      'ClientRequestFailed',
      'ClientRequestFulfilled',
      'WithdrawalFulfilled',
      'WithdrawalRequested',
    ]);

    // API calls
    expect(Airnode.topics.ClientRequestCreated).toEqual(
      '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b'
    );
    expect(Airnode.topics.ClientFullRequestCreated).toEqual(
      '0x775e78a8e7375d14ad03d31edd0a27b29a055f732bca987abfe8082c16ed7e44'
    );

    expect(Airnode.topics.ClientRequestFulfilled).toEqual(
      '0xcde46e28d8d3e348e5f5b4fcc511fe3b1f9b0f549cd8332f0da31802a6f2bf61'
    );
    expect(Airnode.topics.ClientRequestFailed).toEqual(
      '0x1cfdd5ace64f15111ef8ed9df04364d0e9a9165cccf8386109347e54661ba3ad'
    );

    // Withdrawals
    expect(Airnode.topics.WithdrawalRequested).toEqual(
      '0x3d0ebccb4fc9730699221da0180970852f595ed5c78781346149123cbbe9f1d3'
    );
    expect(Airnode.topics.WithdrawalFulfilled).toEqual(
      '0x9e7b58b29aa3b972bb0f457499d0dfd00bf23905b0c3358fb864e7120402aefa'
    );
  });
});
