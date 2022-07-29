import { formatMetadata } from './logging';

describe('formatMetadata', () => {
  it('returns empty string for no metadata', () => {
    expect(formatMetadata({})).toEqual('');
  });

  it('formats metadata accordingly', () => {
    expect(
      formatMetadata({
        'Coordinator-ID': '123456',
        'Additional-info': 'abc',
      })
    ).toEqual('Coordinator-ID:123456, Additional-info:abc');
  });
});
