import isEmpty from 'lodash/isEmpty';
import { Parameters } from '../types';

type CookieHeader = {
  readonly Cookie: string;
};

export function buildHeader(cookies: Parameters): CookieHeader | object {
  if (isEmpty(cookies)) {
    return {};
  }

  const keys = Object.keys(cookies);

  const cookieValues = keys.reduce((values, key) => {
    const value = encodeURIComponent(cookies[key]);
    const cookie = `${key}=${value};`;
    return [...values, cookie];
  }, [] as readonly string[]);

  return { Cookie: cookieValues.join(' ') };
}
