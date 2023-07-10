import { AirnodeRrpV0DryRunFactory, airnodeRrpDryRunTopics } from './airnodeRrpDryRun';

describe('AirnodeRrpDryRun', () => {
  it('exposes the contract ABI function', () => {
    const functions = AirnodeRrpV0DryRunFactory.abi
      .filter((fn: any) => fn.type === 'function')
      .map((fn: any) => fn.name)
      .sort();

    expect(functions).toEqual(['fulfill']);
  });

  it('exposes the contract ABI events', () => {
    const events = AirnodeRrpV0DryRunFactory.abi
      .filter((fn: any) => fn.type === 'event')
      .map((fn: any) => fn.name)
      .sort();
    expect(events).toEqual(['FulfilledRequest']);
  });

  it('exposes the contract topics', () => {
    // Make sure all topics are covered
    expect.assertions(2);

    expect(Object.keys(airnodeRrpDryRunTopics).sort()).toEqual(['FulfilledRequest']);

    // API calls
    expect(airnodeRrpDryRunTopics.FulfilledRequest).toEqual(
      '0xc0977dab79883641ece94bb6a932ca83049f561ffff8d8daaeafdbc1acce9e0a'
    );
  });
});
