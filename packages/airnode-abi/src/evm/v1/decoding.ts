import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import { PARAMETER_TYPE_ENCODINGS } from '../utils';
import { ABIParameterType, DecodedMap } from '../../types';

type TransformationFunction = (value: any) => string;

type TransformationReference = {
  [key in ABIParameterType]: TransformationFunction | null;
};

// Certain types need to be parsed after ABI decoding happens
const TRANSFORMATIONS: TransformationReference = {
  bytes: ethers.utils.parseBytes32String,
  bytes32: ethers.utils.parseBytes32String,
  string: null,
  address: null,
  int256: null,
  uint256: null,
};

export function decodeMap(encodedData: string): DecodedMap {
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
  const fullParameterTypes: ABIParameterType[] = Array.from(encodedParameterTypes).map(
    (type) => PARAMETER_TYPE_ENCODINGS[type]
  );

  // The first `bytes32` is the type encoding
  const initialDecodedTypes: ABIParameterType[] = ['bytes32'];

  const decodingTypes = fullParameterTypes.reduce((acc, type) => {
    // Each parameter is expected to have a `bytes32` name
    return [...acc, 'bytes32', type];
  }, initialDecodedTypes);

  // It's important to leave the `encodedData` intact here and not try to trim off the first
  // 32 bytes (i.e. the header) because that results in the decoding failing. So decode
  // exactly what you got from the contract, including the header.
  const decodedData = ethers.utils.defaultAbiCoder.decode(decodingTypes, encodedData);

  const [_version, ...decodedParameters] = decodedData;
  const parameterPairs = chunk(decodedParameters, 2);

  return parameterPairs.reduce((acc, pair, index) => {
    const [encodedName, encodedValue] = pair;
    const name = ethers.utils.parseBytes32String(encodedName);
    const type = fullParameterTypes[index];
    const transformation = TRANSFORMATIONS[type];
    if (!transformation) {
      return { ...acc, [name]: encodedValue };
    }
    const parsedValue = ethers.utils.parseBytes32String(encodedValue);
    return { ...acc, [name]: parsedValue };
  }, {});
}
