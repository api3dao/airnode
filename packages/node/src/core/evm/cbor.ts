import { decodeMap, encodeMap } from 'cbor-custom';
import { ApiCallParameters } from '../../types';

export function encode(parameters: { [key: string]: any }): string {
  return encodeMap(parameters);
}

export function safeDecode(encodedParameters: string): ApiCallParameters | null {
  if (!encodedParameters) {
    return {};
  }

  // It's unlikely that we'll have to deal with invalid parameters, but just in case,
  // wrap the decoding in a try/catch
  try {
    return decodeMap(encodedParameters);
  } catch (e) {
    return null;
  }
}
