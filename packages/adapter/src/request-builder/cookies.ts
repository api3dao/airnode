import isEmpty from 'lodash/isEmpty';
import { Parameters } from '../types';

interface CookieHeader {
  Cookie?: string;
}

export function buildHeader(cookies: Parameters): CookieHeader {
  if (isEmpty(cookies)) {
    return {};
  }

  const keys = Object.keys(cookies);

  const cookieValues = keys.reduce((values, key) => {
    const value = encodeURIComponent(cookies[key]);
    const cookie = `${key}=${value};`;
    return [...values, cookie];
  }, []);

  return { Cookie: cookieValues.join(' ') };
}
