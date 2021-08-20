import { AirnodeRrpArtifact, airnodeRrpTopics } from './airnodeRrp';

describe('AirnodeRrp', () => {
  it('exposes the contract ABI function', () => {
    const functions = AirnodeRrpArtifact.abi
      .filter((fn: any) => fn.type === 'function')
      .map((fn: any) => fn.name)
      .sort();

    expect(functions).toEqual([
      'airnodeToXpub',
      'checkAuthorizationStatus',
      'checkAuthorizationStatuses',
      'clientAddressToNoRequests',
      'createRequester',
      'createTemplate',
      'fail',
      'fulfill',
      'fulfillWithdrawal',
      'getTemplate',
      'getTemplates',
      'makeFullRequest',
      'makeRequest',
      'requestWithIdHasFailed',
      'requestWithdrawal',
      'requesterIndexToAdmin',
      'requesterIndexToClientAddressToEndorsementStatus',
      'requesterIndexToNextWithdrawalRequestIndex',
      'setAirnodeToXpub',
      'setClientEndorsementStatus',
      'setRequesterAdmin',
    ]);
  });

  it('exposes the contract ABI events', () => {
    const events = AirnodeRrpArtifact.abi
      .filter((fn: any) => fn.type === 'event')
      .map((fn: any) => fn.name)
      .sort();
    expect(events).toEqual([
      'AirnodeParametersSet',
      'ClientEndorsementStatusSet',
      'MadeFullRequest',
      'MadeTemplateRequest',
      'FailedRequest',
      'FulfilledRequest',
      'RequesterCreated',
      'RequesterUpdated',
      'TemplateCreated',
      'FulfilledWithdrawal',
      'RequestedWithdrawal',
    ]);
  });

  it('exposes the contract topics', () => {
    // Make sure all topics are covered
    expect.assertions(7);

    expect(Object.keys(airnodeRrpTopics).sort()).toEqual([
      'MadeFullRequest',
      'MadeTemplateRequest',
      'FailedRequest',
      'FulfilledRequest',
      'FulfilledWithdrawal',
      'RequestedWithdrawal',
    ]);

    // API calls
    expect(airnodeRrpTopics.MadeTemplateRequest).toEqual(
      '0x8339fddbb81e588a9ed04dec82ee9ae6c7a185f44835adaaa2ace50ce3a14aaf'
    );
    expect(airnodeRrpTopics.MadeFullRequest).toEqual(
      '0xe8ae99161b1547fd1c6ff3cb9660293fa4cd770fd52f72ff0362d64d8bccc08e'
    );

    expect(airnodeRrpTopics.FulfilledRequest).toEqual(
      '0xcde46e28d8d3e348e5f5b4fcc511fe3b1f9b0f549cd8332f0da31802a6f2bf61'
    );
    expect(airnodeRrpTopics.FailedRequest).toEqual(
      '0x1cfdd5ace64f15111ef8ed9df04364d0e9a9165cccf8386109347e54661ba3ad'
    );

    // Withdrawals
    expect(airnodeRrpTopics.RequestedWithdrawal).toEqual(
      '0x3d0ebccb4fc9730699221da0180970852f595ed5c78781346149123cbbe9f1d3'
    );
    expect(airnodeRrpTopics.FulfilledWithdrawal).toEqual(
      '0x9e7b58b29aa3b972bb0f457499d0dfd00bf23905b0c3358fb864e7120402aefa'
    );
  });
});
