import crypto from 'crypto';

export function randomString(n: number) {
  return crypto.randomBytes(n).toString('hex');
}
