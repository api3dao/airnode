import * as cookies from './cookies';

describe('buildHeader', () => {
  it('returns an empty object if no cookies are present', () => {
    const res = cookies.buildHeader({});
    expect(res).toEqual({});
  });

  it('returns multiple cookies in the header', () => {
    const cookiesObj = { key1: 'secretkey', key2: 'anothersecret' };
    const res = cookies.buildHeader(cookiesObj);
    expect(res).toEqual({
      Cookie: 'key1=secretkey; key2=anothersecret;',
    });
  });

  it('encodes special characters', () => {
    const cookiesObj = { key1: ';,/?:@&=+$' };
    const res = cookies.buildHeader(cookiesObj);
    expect(res).toEqual({
      Cookie: 'key1=%3B%2C%2F%3F%3A%40%26%3D%2B%24;',
    });
  });
});
