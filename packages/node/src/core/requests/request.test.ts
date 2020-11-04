import * as fixtures from 'test/fixtures';
import * as request from './request';
import { GroupedRequests, RequestErrorCode } from 'src/types';

describe('hasNoRequests', () => {
  it('returns false if API calls are present', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall()],
      withdrawals: [],
    };
    expect(request.hasNoRequests(requests)).toEqual(false);
  });

  it('returns false if withdrawals are present', () => {
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [fixtures.requests.createWithdrawal()],
    };
    expect(request.hasNoRequests(requests)).toEqual(false);
  });

  it('returns true if there are no requests present', () => {
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [],
    };
    expect(request.hasNoRequests(requests)).toEqual(true);
  });
});

describe('getStatusNames', () => {
  it('returns a list of all status names', () => {
    expect(request.getStatusNames()).toEqual(['Pending', 'Fulfilled', 'Ignored', 'Blocked', 'Errored']);
  });
});

describe('getErrorCode', () => {
  it('returns the error code for the request', () => {
    const apiCall = fixtures.requests.createApiCall({ errorCode: RequestErrorCode.TemplateNotFound });
    expect(request.getErrorCode(apiCall)).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('returns 0 if no error code is present', () => {
    const apiCall = fixtures.requests.createApiCall({ errorCode: undefined });
    expect(request.getErrorCode(apiCall)).toEqual(0);
  });
});
