import * as request from './request';
import * as fixtures from '../../test/fixtures';
import { GroupedRequests, RequestErrorMessage, RequestStatus } from '../types';

describe('dropRequestsAfterLimit', () => {
  it('drops requests that have passed the specified block limit', () => {
    const metadata = fixtures.requests.buildMetadata({ ignoreBlockedRequestsAfterBlocks: 1 });
    const apiCall = fixtures.requests.buildApiCall({ metadata });
    const res = request.hasExceededIgnoredBlockLimit(apiCall);
    expect(res).toEqual(true);
  });

  it('blocks requests that are within the specified block limit', () => {
    const metadata = fixtures.requests.buildMetadata({ ignoreBlockedRequestsAfterBlocks: 100 });
    const apiCall = fixtures.requests.buildApiCall({ metadata });
    const res = request.hasExceededIgnoredBlockLimit(apiCall);
    expect(res).toEqual(false);
  });
});

describe('filterActionableApiCalls', () => {
  it('returns actionable API calls', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ status: RequestStatus.Pending }),
      fixtures.requests.buildApiCall({ status: RequestStatus.Blocked }),
    ];
    expect(request.filterActionableApiCalls(apiCalls)).toEqual([
      fixtures.requests.buildApiCall({ status: RequestStatus.Pending }),
    ]);
  });
});

describe('filterActionableWithdrawals', () => {
  it('returns actionable withdrawals', () => {
    const withdrawals = [
      fixtures.requests.buildWithdrawal({ status: RequestStatus.Pending }),
      fixtures.requests.buildWithdrawal({ status: RequestStatus.Blocked }),
    ];
    expect(request.filterActionableWithdrawals(withdrawals)).toEqual([
      fixtures.requests.buildWithdrawal({ status: RequestStatus.Pending }),
    ]);
  });
});

describe('hasActionableApiCalls', () => {
  it('returns true if pending API calls are present', () => {
    const apiCalls = [fixtures.requests.buildApiCall({ status: RequestStatus.Pending })];
    expect(request.hasActionableApiCalls(apiCalls)).toEqual(true);
  });

  it('returns false if there are no pending or errored API calls', () => {
    const apiCalls = [fixtures.requests.buildApiCall({ status: RequestStatus.Blocked })];
    expect(request.hasActionableApiCalls(apiCalls)).toEqual(false);
  });

  it('returns false if there are no API calls', () => {
    expect(request.hasActionableApiCalls([])).toEqual(false);
  });
});

describe('hasActionableWithdrawals', () => {
  it('returns true if pending withdrawals are present', () => {
    const withdrawals = [fixtures.requests.buildWithdrawal({ status: RequestStatus.Pending })];
    expect(request.hasActionableWithdrawals(withdrawals)).toEqual(true);
  });

  it('returns false if there are no pending withdrawals', () => {
    const withdrawals = [fixtures.requests.buildWithdrawal({ status: RequestStatus.Blocked })];
    expect(request.hasActionableWithdrawals(withdrawals)).toEqual(false);
  });

  it('returns false if there are no withdrawals', () => {
    expect(request.hasActionableWithdrawals([])).toEqual(false);
  });
});

describe('hasNoActionableRequests', () => {
  it('returns false if actionable API calls are present', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.buildApiCall({ status: RequestStatus.Pending })],
      withdrawals: [],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(false);
  });

  it('returns false if actionable withdrawals are present', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.buildApiCall({ status: RequestStatus.Blocked })],
      withdrawals: [fixtures.requests.buildWithdrawal()],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(false);
  });

  it('returns true if there are no actionable API calls or withdrawals', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.buildApiCall({ status: RequestStatus.Blocked })],
      withdrawals: [fixtures.requests.buildWithdrawal({ status: RequestStatus.Blocked })],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(true);
  });

  it('returns true if there are no requests present', () => {
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(true);
  });
});

describe('getStatusNames', () => {
  it('returns a list of all status names', () => {
    expect(request.getStatusNames()).toEqual(['Pending', 'Blocked']);
  });
});

describe('getErrorMessage', () => {
  it('returns the error message for the request', () => {
    const apiCall = fixtures.requests.buildApiCall({ errorMessage: RequestErrorMessage.TemplateNotFound });
    expect(request.getErrorMessage(apiCall)).toEqual(RequestErrorMessage.TemplateNotFound);
  });

  it('returns 0 if no error message is present', () => {
    const apiCall = fixtures.requests.buildApiCall({ errorMessage: undefined });
    expect(request.getErrorMessage(apiCall)).toBeUndefined();
  });
});
