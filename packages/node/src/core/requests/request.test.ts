import * as fixtures from 'test/fixtures';
import * as request from './request';
import { RequestErrorCode } from 'src/types';

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
