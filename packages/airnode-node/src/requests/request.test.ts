import * as request from './request';
import * as fixtures from '../../test/fixtures';
import { RequestErrorMessage } from '../types';

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
