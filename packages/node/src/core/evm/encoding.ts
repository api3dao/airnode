import { ethers } from 'ethers';

const V1_TYPE_ENCODINGS = {
  B: 'bytes',
  S: 'string',
  a: 'address',
  b: 'bytes32',
  i: 'int256',
  u: 'uint256'
};

function decodeV1Schema(encodedParameterTypes: string) {

  // Replace encoded types with full type names
  const decodedParameterTypes = Array.from(encodedParameterTypes).map((type) => parameterTypeEncodings[type]);

  const decodingType,

}

export function decodeAirnodeAbi(encodedData: string) {
  // Alternatively:
  // const header = encodedData.substring(0, 66);
  const header = ethers.utils.hexlify(ethers.utils.arrayify(encodedData).slice(0, 32));

  const parsedHeader = ethers.utils.parseBytes32String(header);

  // Get and validate the first character of the header
  const encodedEncodingVersion = parsedHeader.substring(0, 1);
  if (encodedEncodingVersion !== '1') {
    throw new Error('Unknown encoding scheme');
  }

  // The rest of the characters represent the parameter types
  const encodedParameterTypes = parsedHeader.substring(1);


  // The first `bytes32` is the type encoding
  // const decodedTypes = ['bytes32'];
  //
  // // Each parameter is expected to have a `bytes32` name
  // for (decodedParameterType of decodedParameterTypes) {
  //   decodedTypes.push('bytes32');
  //   decodedTypes.push(decodedParameterType);
  // }

  // It's important to leave the `encodedData` intact here and not try to trim off the first
  // 32 bytes (i.e. the header) because that results in the decoding to fail. So decode
  // exactly what you got from the contract, including the header.
  const decodedData = ethers.utils.defaultAbiCoder.decode(decodedTypes, encodedData);

  // Match parameter names with values
  const decodedParameters = {};
  for (let ind = 1; ind < decodedData.length; ind += 2) {
    decodedParameters[ethers.utils.parseBytes32String(decodedData[ind])] = decodedData[ind + 1];
  }
  return decodedParameters;
}
