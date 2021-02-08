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
      'ClientShortRequestCreated',
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
    expect.assertions(8);

    expect(Object.keys(Airnode.topics).sort()).toEqual([
      'ClientFullRequestCreated',
      'ClientRequestCreated',
      'ClientRequestFailed',
      'ClientRequestFulfilled',
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
