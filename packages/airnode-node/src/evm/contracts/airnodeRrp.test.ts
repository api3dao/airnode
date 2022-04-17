import { AirnodeRrpV0Factory, airnodeRrpTopics } from './airnodeRrp';

describe('AirnodeRrp', () => {
  it('exposes the contract ABI function', () => {
    const functions = AirnodeRrpV0Factory.abi
      .filter((fn: any) => fn.type === 'function')
      .map((fn: any) => fn.name)
      .sort();

    expect(functions).toEqual([
      'checkAuthorizationStatus',
      'checkAuthorizationStatuses',
      'createTemplate',
      'fail',
      'fulfill',
      'fulfillWithdrawal',
      'getTemplates',
      'makeFullRequest',
      'makeTemplateRequest',
      'requestIsAwaitingFulfillment',
      'requestWithdrawal',
      'requesterToRequestCountPlusOne',
      'setSponsorshipStatus',
      'sponsorToRequesterToSponsorshipStatus',
      'sponsorToWithdrawalRequestCount',
      'templates',
    ]);
  });

  it('exposes the contract ABI events', () => {
    const events = AirnodeRrpV0Factory.abi
      .filter((fn: any) => fn.type === 'event')
      .map((fn: any) => fn.name)
      .sort();
    expect(events).toEqual([
      'CreatedTemplate',
      'FailedRequest',
      'FulfilledRequest',
      'FulfilledWithdrawal',
      'MadeFullRequest',
      'MadeTemplateRequest',
      'RequestedWithdrawal',
      'SetSponsorshipStatus',
    ]);
  });

  it('exposes the contract topics', () => {
    // Make sure all topics are covered
    expect.assertions(7);

    expect(Object.keys(airnodeRrpTopics).sort()).toEqual([
      'FailedRequest',
      'FulfilledRequest',
      'FulfilledWithdrawal',
      'MadeFullRequest',
      'MadeTemplateRequest',
      'RequestedWithdrawal',
    ]);

    // API calls
    expect(airnodeRrpTopics.MadeTemplateRequest).toEqual(
      '0xeb39930cdcbb560e6422558a2468b93a215af60063622e63cbb165eba14c3203'
    );
    expect(airnodeRrpTopics.MadeFullRequest).toEqual(
      '0x3a52c462346de2e9436a3868970892956828a11b9c43da1ed43740b12e1125ae'
    );

    expect(airnodeRrpTopics.FulfilledRequest).toEqual(
      '0xc0977dab79883641ece94bb6a932ca83049f561ffff8d8daaeafdbc1acce9e0a'
    );
    expect(airnodeRrpTopics.FailedRequest).toEqual(
      '0xc7143b2270cddda57e0087ca5e2a4325657dcab10d10f6b1f9d5ce6b41cb97fc'
    );

    // Withdrawals
    expect(airnodeRrpTopics.RequestedWithdrawal).toEqual(
      '0xd48d52c7c6d0c940f3f8d07591e1800ef3a70daf79929a97ccd80b4494769fc7'
    );
    expect(airnodeRrpTopics.FulfilledWithdrawal).toEqual(
      '0xadb4840bbd5f924665ae7e0e0c83de5c0fb40a98c9b57dba53a6c978127a622e'
    );
  });
});
