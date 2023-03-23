import find from 'lodash/find';
import map from 'lodash/map';
import { z } from 'zod';
import { subMinutes, isBefore, toDate } from 'date-fns';
import { ethers } from 'ethers';
import { decode } from '@api3/airnode-abi';
import { logger } from '@api3/airnode-utilities';
import { goSync } from '@api3/promise-utils';
import { ApiCallParameters, ApiCallTemplateWithoutId } from '../../types';
import { Config, endpointIdSchema } from '../../config';
import { apiCallParametersSchema } from '../../validation';
import { getAirnodeWalletFromPrivateKey } from '../../evm';
import { getExpectedTemplateIdV1 } from '../../evm/templates';

const TIMESTAMP_DEVIATION = 2; // in minutes
// Solidity type(int224).min
export const INT224_MIN = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(223)).mul(ethers.BigNumber.from(-1));
// Solidity type(int224).max
export const INT224_MAX = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(223)).sub(ethers.BigNumber.from(1));
// Number that represents 100% is chosen to avoid overflows in DapiServer's
// `calculateUpdateInPercentage()`. Since the reported data needs to fit
// into 224 bits, its multiplication by 10^8 is guaranteed not to overflow.
export const HUNDRED_PERCENT = ethers.BigNumber.from(1e8);
export const ONE_PERCENT = HUNDRED_PERCENT.div(ethers.BigNumber.from(100)).mul(ethers.BigNumber.from(1));

export type VerificationSuccess<T> = T & {
  success: true;
};

export type VerificationFailure = {
  success: false;
  statusCode: number;
  error: { message: string };
};

export type VerificationResult<T> = VerificationSuccess<T> | VerificationFailure;

function verifyEndpointId(
  config: Config,
  endpointId: unknown,
  gateway: 'http' | 'httpSignedData'
): VerificationResult<z.SafeParseSuccess<string>> {
  const parsedEndpointId = endpointIdSchema.safeParse(endpointId);
  if (!parsedEndpointId.success) {
    return {
      success: false,
      // Both GCP and AWS gateway throw custom error messages when the "endpointId" is missing completely. This error is
      // only thrown when the endpoint ID of the request does not match the endpoint ID schema.
      statusCode: 400,
      error: { message: 'Invalid query parameters' },
    };
  }

  const trigger = find(config.triggers[gateway], ['endpointId', endpointId]);
  if (!trigger) {
    return {
      success: false,
      statusCode: 400,
      error: { message: `Unable to find endpoint with ID:'${endpointId}'` },
    };
  }

  return parsedEndpointId;
}

export interface HttpRequestData {
  parameters: ApiCallParameters;
  endpointId: string;
}

export function verifyHttpRequest(
  config: Config,
  parameters: unknown,
  endpointId: string
): VerificationResult<HttpRequestData> {
  const parametersValidation = apiCallParametersSchema.safeParse(parameters);
  if (!parametersValidation.success) {
    return {
      success: false,
      // This error and status code is returned by AWS gateway when the request does not match the openAPI
      // specification. We want the same error to be returned by the GCP gateway.
      statusCode: 400,
      error: { message: 'Invalid request body' },
    };
  }
  const validParameters = parametersValidation.data;

  const endpointIdValidation = verifyEndpointId(config, endpointId, 'http');
  if (!endpointIdValidation.success) return endpointIdValidation;
  const validEndpointId = endpointIdValidation.data;

  return { success: true, parameters: validParameters, endpointId: validEndpointId };
}

export interface HttpSignedDataRequestData {
  encodedParameters: string;
  endpointId: string;
}

export function verifyHttpSignedDataRequest(
  config: Config,
  encodedParameters: string,
  endpointId: string
): VerificationResult<HttpSignedDataRequestData> {
  // Ensure the encoded parameters are valid. We do it outside of the schema because we want to return a custom error
  const decodedParameters = goSync(() => decode(encodedParameters));
  if (!decodedParameters.success) {
    return {
      success: false,
      statusCode: 400,
      error: { message: `Request contains invalid encodedParameters: ${encodedParameters}` },
    };
  }

  const endpointIdVerification = verifyEndpointId(config, endpointId, 'httpSignedData');
  if (!endpointIdVerification.success) return endpointIdVerification;
  const validEndpointId = endpointIdVerification.data;

  return { success: true, encodedParameters, endpointId: validEndpointId };
}

const beaconSchema = z.object({
  airnodeAddress: z.string(),
  endpointId: z.string(),
  encodedParameters: z.string(),
  // Signed data might be missing for some of the beacons (as long as the majority has the data). We still need to know
  // all of the beacons to derive the data feed ID.
  signedData: z
    .object({
      encodedValue: z.string(),
      timestamp: z.string(),
      signature: z.string(),
    })
    .optional(),
});

export type Beacon = z.infer<typeof beaconSchema>;

export interface BeaconWithIds extends Beacon {
  beaconId: string;
  templateId: string;
}
export interface BeaconDecoded extends Required<BeaconWithIds> {
  decodedValue: ethers.BigNumber;
}

export const signOevDataBodySchema = z.object({
  chainId: z.number().positive(),
  dapiServerAddress: z.string(),
  oevProxyAddress: z.string(),
  updateId: z.string(),
  bidderAddress: z.string(),
  bidAmount: z.string(),
  // The order of beacons is important as it determines the beacon set ID.
  beacons: z.array(beaconSchema),
});

export type ProcessSignOevDataRequestBody = z.infer<typeof signOevDataBodySchema>;

export function decodeBeaconsWithData(beacons: Required<BeaconWithIds>[]) {
  const currentTime = new Date();
  const validDecodedBeacons: BeaconDecoded[] = [];

  const goBeaconValidation = goSync(() => {
    for (const beacon of beacons) {
      const { airnodeAddress, templateId, signedData } = beacon;
      const { encodedValue, timestamp, signature } = signedData;

      // The timestamp is older than the last 2 minutes
      if (isBefore(toDate(Number(timestamp) * 1000), subMinutes(currentTime, TIMESTAMP_DEVIATION))) {
        throw new Error('Beacon timestamp too old');
      }

      const message = ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [templateId, timestamp, encodedValue])
        )
      );
      const addressFromSignature = ethers.utils.verifyMessage(message, signature!);
      // Signature doesn't match
      if (airnodeAddress !== addressFromSignature) {
        throw new Error('Invalid beacon signature');
      }

      const decodedValue = ethers.BigNumber.from(ethers.utils.defaultAbiCoder.decode(['int256'], encodedValue!)[0]);
      if (decodedValue.gt(INT224_MAX) || decodedValue.lt(INT224_MIN)) {
        throw new Error('Beacon value not within range');
      }

      validDecodedBeacons.push({ ...beacon, decodedValue });
    }
  });
  if (!goBeaconValidation.success) {
    logger.log(`Invalid beacon data: ${goBeaconValidation.error}`);
    return null;
  }

  return validDecodedBeacons;
}

export function allBeaconsConsistent(beacons: BeaconDecoded[]) {
  const avg = beacons
    .reduce((sum, beacon) => sum.add(beacon.decodedValue), ethers.BigNumber.from(0))
    .div(ethers.BigNumber.from(beacons.length));
  const maxDeviation = avg.mul(ONE_PERCENT).div(HUNDRED_PERCENT);

  return beacons.every((beacon) => avg.sub(beacon.decodedValue).abs().lte(maxDeviation));
}

export function deriveBeaconId(airnodeAddress: string, templateId: string) {
  return ethers.utils.solidityKeccak256(['address', 'bytes32'], [airnodeAddress, templateId]);
}

export function deriveBeaconSetId(beaconIds: string[]) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [beaconIds]));
}

export function calculateMedian(arr: ethers.BigNumber[]) {
  const mid = Math.floor(arr.length / 2);
  const nums = [...arr].sort((a, b) => {
    if (a.lt(b)) return -1;
    else if (a.gt(b)) return 1;
    else return 0;
  });
  return arr.length % 2 !== 0 ? nums[mid] : nums[mid - 1].add(nums[mid]).div(2);
}

export const calculateUpdateTimestamp = (timestamps: string[]) => {
  const accumulatedTimestamp = timestamps.reduce((total, next) => total + parseInt(next, 10), 0);
  return Math.floor(accumulatedTimestamp / timestamps.length);
};

export const validateBeacons = (beacons: Beacon[]): BeaconWithIds[] | null => {
  const goValidateBeacons = goSync(() => {
    const beaconsWithIds: BeaconWithIds[] = [];
    for (const beacon of beacons) {
      const { airnodeAddress, encodedParameters, endpointId } = beacon;

      // To check parameters validity, exception is caught by the goSync
      decode(encodedParameters);

      const template: ApiCallTemplateWithoutId = {
        airnodeAddress,
        endpointId,
        encodedParameters,
      };
      // Both template ID and beacon ID can fail, but it's OK because we are wrapping the validation in goSync
      const templateId = getExpectedTemplateIdV1(template);
      const beaconId = deriveBeaconId(airnodeAddress, templateId);

      beaconsWithIds.push({ ...beacon, templateId, beaconId });
    }

    return beaconsWithIds;
  });

  if (!goValidateBeacons.success) return null;
  return goValidateBeacons.data;
};

export function verifySignOevDataRequest(requestBody: ProcessSignOevDataRequestBody): VerificationResult<{
  oevUpdateHash: string;
  beacons: BeaconDecoded[];
}> {
  const { chainId, dapiServerAddress, oevProxyAddress, updateId, bidderAddress, bidAmount, beacons } = requestBody;

  const beaconsWithIds = validateBeacons(beacons);
  if (!beaconsWithIds) {
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Some of the beacons are invalid' },
    };
  }

  const majority = Math.floor(beaconsWithIds.length / 2) + 1;
  const beaconsWithData = beaconsWithIds.filter((beacon) => beacon.signedData) as Required<BeaconWithIds>[];

  // We must have at least a majority of beacons with data
  if (beaconsWithData.length < majority) {
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with data to proceed' },
    };
  }

  const airnodeWallet = getAirnodeWalletFromPrivateKey();
  const airnodeAddress = airnodeWallet.address;
  if (!beaconsWithIds.some((beacon) => beacon.airnodeAddress === airnodeAddress)) {
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Missing beacon data from the Airnode requested for signing' },
    };
  }

  const decodedBeacons = decodeBeaconsWithData(beaconsWithData);
  if (!decodedBeacons) {
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with valid data to proceed' },
    };
  }

  if (!allBeaconsConsistent(decodedBeacons)) {
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Inconsistent beacon data' },
    };
  }

  const beaconIds = beaconsWithIds.map((beacon) => beacon.beaconId);
  // We are computing both update value and data feed ID in Airnode to prevent spoofing the signature.
  const dataFeedId = beaconIds.length === 1 ? beaconIds[0] : deriveBeaconSetId(beaconIds);
  const timestamp = calculateUpdateTimestamp(map(decodedBeacons, 'signedData.timestamp'));
  const updateValue = calculateMedian(map(decodedBeacons, 'decodedValue'));

  // Derive the update hash during validation, because there can be an error during the encoding. We want to respond
  // with status 400 in that case. The processing implementation can assume the request is valid and error should be
  // treated as internal server error (status 500).
  const goDeriveOevUpdateHash = goSync(() => {
    const encodedUpdateValue = ethers.utils.defaultAbiCoder.encode(['int256'], [updateValue]);
    logger.debug(
      `Deriving update hash. Params: ${JSON.stringify([
        chainId,
        dapiServerAddress,
        oevProxyAddress,
        dataFeedId,
        updateId,
        timestamp,
        encodedUpdateValue,
        bidderAddress,
        bidAmount,
      ])}`
    );
    return ethers.utils.solidityKeccak256(
      ['uint256', 'address', 'address', 'bytes32', 'bytes32', 'uint256', 'bytes', 'address', 'uint256'],
      [
        chainId,
        dapiServerAddress,
        oevProxyAddress,
        dataFeedId,
        updateId,
        timestamp,
        encodedUpdateValue,
        bidderAddress,
        bidAmount,
      ]
    );
  });
  if (!goDeriveOevUpdateHash.success) {
    logger.error('Error deriving OEV update hash', goDeriveOevUpdateHash.error);
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Error deriving OEV update hash' },
    };
  }

  return {
    success: true,
    oevUpdateHash: goDeriveOevUpdateHash.data,
    beacons: decodedBeacons,
  };
}

export const checkRequestOrigin = (allowedOrigins: string[], origin?: string) =>
  allowedOrigins.find((allowedOrigin) => allowedOrigin === '*') ||
  (origin && allowedOrigins.find((allowedOrigin) => allowedOrigin === origin));

export const buildCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'Content-Type',
});

export const verifyRequestOrigin = (allowedOrigins: string[], origin?: string) => {
  const allowedOrigin = checkRequestOrigin(allowedOrigins, origin);

  // Return CORS headers to be used by the response if the origin is allowed
  if (allowedOrigin) return { success: true, headers: buildCorsHeaders(allowedOrigin) };

  return { success: false, error: { message: 'CORS origin verification failed.' } };
};
