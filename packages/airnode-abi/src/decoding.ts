import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import { PARAMETER_SHORT_TYPES, ParameterTypeShort, ParameterType, TYPE_TRANSFORMATIONS } from './constants';
import { DecodedMap, ValueTransformation } from './types';

// Certain types need to be parsed after ABI decoding happens
const VALUE_TRANSFORMATIONS: ValueTransformation = {
  string32: ethers.utils.parseBytes32String,
  int256: (value: ethers.BigNumber) => value.toString(),
  uint256: (value: ethers.BigNumber) => value.toString(),
};

function buildDecodedMap(types: ParameterType[], nameValuePairs: [string, string][]): DecodedMap {
  return nameValuePairs.reduce((acc, pair, index) => {
    const [encodedName, encodedValue] = pair;
    const name = ethers.utils.parseBytes32String(encodedName);
    const type = types[index];
    const transform = VALUE_TRANSFORMATIONS[type];
    // If the type does not need to be transformed, return it as is
    if (!transform) {
      return { ...acc, [name]: encodedValue };
    }
    const parsedValue = transform(encodedValue);
    return { ...acc, [name]: parsedValue };
  }, {});
}

export function decode(encodedData: string): DecodedMap {
  // Special cases for empty parameters
  if (encodedData === '0x') {
    return {};
  }

  // Alternatively:
  // const header = encodedData.substring(0, 66);
  const header = ethers.utils.hexlify(ethers.utils.arrayify(encodedData).slice(0, 32));
  const parsedHeader = ethers.utils.parseBytes32String(header);

  // Get and validate the first character of the header
  const encodedEncodingVersion = parsedHeader.substring(0, 1);
  if (encodedEncodingVersion !== '1') {
    throw new Error(`Unknown ABI schema version: ${encodedEncodingVersion}`);
  }

  // The version is specified by the first byte and the parameters are specified by the rest
  const encodedParameterTypes = parsedHeader.substring(1);

  // Replace encoded types with full type names
  const fullParameterTypes: ParameterType[] = Array.from(encodedParameterTypes).map(
    (type) => PARAMETER_SHORT_TYPES[type as ParameterTypeShort]
  );

  // The first `bytes32` is the type encoding
  const initialDecodedTypes: ParameterType[] = ['bytes32'];

  const decodingTypes = fullParameterTypes.reduce((acc: string[], type) => {
    // Each parameter is expected to have a `bytes32` name
    return [...acc, 'bytes32' as const, TYPE_TRANSFORMATIONS[type] ?? type];
  }, initialDecodedTypes);

  // It's important to leave the `encodedData` intact here and not try to trim off the first
  // 32 bytes (i.e. the header) because that results in the decoding failing. So decode
  // exactly what you got from the contract, including the header.
  const decodedData = ethers.utils.defaultAbiCoder.decode(decodingTypes, encodedData);

  // Checks if the original encoded data matches the re-encoded data
  const reEncodedData = ethers.utils.defaultAbiCoder.encode(decodingTypes, decodedData);
  if (reEncodedData !== encodedData) {
    throw new Error('Re-encoding mismatch');
  }

  const [_version, ...decodedParameters] = decodedData;
  const nameValuePairs = chunk(decodedParameters, 2) as [string, string][];

  return buildDecodedMap(fullParameterTypes, nameValuePairs);
}
