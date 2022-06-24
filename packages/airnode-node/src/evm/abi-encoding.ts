import { decode } from '@api3/airnode-abi';
import { goSync } from '@api3/promise-utils';
import { ApiCallParameters } from '../types';

export function safeDecode(encodedParameters: string): ApiCallParameters | null {
  // It's unlikely that we'll have to deal with invalid parameters, but just in case,
  // wrap the decoding in a try/catch
  const goDecode = goSync(() => decode(encodedParameters));
  if (!goDecode.success) return null;

  return goDecode.data;
}
