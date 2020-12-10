import { decode } from '@airnode/airnode-abi';
import { ApiCallParameters } from '../../types';

export function safeDecode(encodedParameters: string): ApiCallParameters | null {
  // It's unlikely that we'll have to deal with invalid parameters, but just in case,
  // wrap the decoding in a try/catch
  try {
    return decode(encodedParameters);
  } catch (e) {
    return null;
  }
}
