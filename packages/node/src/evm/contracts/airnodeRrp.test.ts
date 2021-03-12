import { AirnodeRrp } from './airnodeRrp';

describe('AirnodeRrp', () => {
  it('exposes the contract ABI function', () => {
    const functions = AirnodeRrp.ABI.filter((fn: any) => fn.type === 'function')
      .map((fn: any) => fn.name)
      .sort();

    expect(functions).toEqual([
      'checkAuthorizationStatus',
      'checkAuthorizationStatuses',
      'clientAddressToNoRequests',
      'createRequester',
      'createTemplate',
      'fail',
      'fulfill',
      'fulfillWithdrawal',
      'getProvider',
      'getProviderAndBlockNumber',
      'getTemplate',
      'getTemplates',
      'makeFullRequest',
      'makeRequest',
      'requestWithIdHasFailed',
      'requestWithdrawal',
      'requesterIndexToAdmin',
      'requesterIndexToClientAddressToEndorsementStatus',
      'requesterIndexToNoWithdrawalRequests',
      'setClientEndorsementStatus',
      'setProviderParameters',
      'setProviderParametersAndForwardFunds',
      'setRequesterAdmin',
    ]);
  });

  it('exposes the contract ABI events', () => {
    const events = AirnodeRrp.ABI.filter((fn: any) => fn.type === 'event')
      .map((fn: any) => fn.name)
      .sort();
    expect(events).toEqual([
      'ClientEndorsementStatusSet',
      'ClientFullRequestCreated',
      'ClientRequestCreated',
      'ClientRequestFailed',
      'ClientRequestFulfilled',
      'ProviderParametersSet',
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

    expect(Object.keys(AirnodeRrp.topics).sort()).toEqual([
      'ClientFullRequestCreated',
      'ClientRequestCreated',
      'ClientRequestFailed',
      'ClientRequestFulfilled',
      'WithdrawalFulfilled',
      'WithdrawalRequested',
    ]);

    // API calls
    expect(AirnodeRrp.topics.ClientRequestCreated).toEqual(
      '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b'
    );
    expect(AirnodeRrp.topics.ClientFullRequestCreated).toEqual(
      '0x775e78a8e7375d14ad03d31edd0a27b29a055f732bca987abfe8082c16ed7e44'
    );

    expect(AirnodeRrp.topics.ClientRequestFulfilled).toEqual(
      '0xcde46e28d8d3e348e5f5b4fcc511fe3b1f9b0f549cd8332f0da31802a6f2bf61'
    );
    expect(AirnodeRrp.topics.ClientRequestFailed).toEqual(
      '0x1cfdd5ace64f15111ef8ed9df04364d0e9a9165cccf8386109347e54661ba3ad'
    );

    // Withdrawals
    expect(AirnodeRrp.topics.WithdrawalRequested).toEqual(
      '0x3d0ebccb4fc9730699221da0180970852f595ed5c78781346149123cbbe9f1d3'
    );
    expect(AirnodeRrp.topics.WithdrawalFulfilled).toEqual(
      '0x9e7b58b29aa3b972bb0f457499d0dfd00bf23905b0c3358fb864e7120402aefa'
    );
  });
});
