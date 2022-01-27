import crypto from 'crypto';

export function randomHexString(evenLength: number) {
  // We could use "string.substring" to enforce length instead, but not sure how would that affect the randomness.
  // Supporting even lengths is enough for now.
  if (evenLength % 2 !== 0) {
    throw new Error(`Expected length to be even. It was: ${evenLength}`);
  }
  return crypto.randomBytes(evenLength / 2).toString('hex');
}
