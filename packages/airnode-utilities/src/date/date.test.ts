import * as dateUtils from './date';

describe('formatDateTime', () => {
  it('returns the formatted string', () => {
    const date = new Date(2020, 3, 27, 12, 34, 45);
    expect(dateUtils.formatDateTime(date)).toEqual('2020-04-27 12:34:45');
  });
});
