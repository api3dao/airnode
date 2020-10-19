import * as verification from './template-verification';
import * as fixtures from 'test/fixtures';

describe('verify', () => {
  it('returns API calls not linked to templates', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: null });
    const [logs, res] = verification.verify([apiCall], {});
    expect(logs).toEqual([]);
    expect(res).toEqual([apiCall]);
  });
});
