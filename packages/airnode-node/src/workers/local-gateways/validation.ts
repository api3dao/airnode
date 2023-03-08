import find from 'lodash/find';
import map from 'lodash/map';
import { z } from 'zod';
import { addMinutes, isBefore, toDate } from 'date-fns';
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
  // Fields encodedValue, timestamp and signature are optional as they might be missing if we have no data for some of the beacons.
  // This is fine as we would ignore those but we still need to know how many beacons are in the beacon set and Airnode
  // addresses to derive the data feed ID.
  encodedValue: z.string().optional(),
  timestamp: z.string().optional(),
  signature: z.string().optional(),
});

type Beacon = z.infer<typeof beaconSchema>;
interface BeaconDecoded extends Required<Beacon> {
  decodedValue: ethers.BigNumber;
}

export const signOevDataBodySchema = z.object({
  chainId: z.number().positive(),
  dapiServerAddress: z.string(),
  oevProxyAddress: z.string(),
  updateId: z.string(),
  bidderAddress: z.string(),
  bidAmount: z.string(),
  signedData: z.array(beaconSchema),
});

export type ProcessSignOevDataRequestBody = z.infer<typeof signOevDataBodySchema>;

export function dropInvalidBeacons(beacons: Beacon[]) {
  const currentTime = new Date();

  return beacons.reduce((result, beacon) => {
    const goBeaconValidation = goSync(() => {
      const { airnodeAddress, endpointId, encodedParameters, encodedValue, timestamp, signature } = beacon;

      // We don't have data for this beacon
      if (!encodedValue || !timestamp || !signature) {
        throw new Error('Missing beacon data');
      }

      // The timestamp is older than the last 2 minutes
      if (isBefore(toDate(Number(timestamp)), addMinutes(currentTime, -TIMESTAMP_DEVIATION))) {
        throw new Error('Beacon timestamp too old');
      }

      // To check parameters validity, exception is caught by the goSync
      decode(encodedParameters);
      const decodedValue = ethers.BigNumber.from(ethers.utils.defaultAbiCoder.decode(['int256'], encodedValue)[0]);

      const template: ApiCallTemplateWithoutId = {
        airnodeAddress,
        endpointId,
        encodedParameters,
      };
      const templateId = getExpectedTemplateIdV1(template);

      const message = ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [templateId, timestamp, encodedValue])
        )
      );
      const addressFromSignature = ethers.utils.verifyMessage(message, signature);

      // Signature doesn't match
      if (airnodeAddress !== addressFromSignature) {
        throw new Error('Invalid beacon signature');
      }

      if (decodedValue.gt(INT224_MAX) || decodedValue.lt(INT224_MIN)) {
        throw new Error('Beacon value not within range');
      }

      return decodedValue;
    });
    if (!goBeaconValidation.success) {
      logger.log(`Invalid beacon data: ${goBeaconValidation.error}`);
      return result;
    }

    const decodedValue = goBeaconValidation.data;
    return [...result, { ...(beacon as Required<Beacon>), decodedValue }];
  }, [] as BeaconDecoded[]);
}

function compareDecodedValue(a: BeaconDecoded, b: BeaconDecoded) {
  if (a.decodedValue.lt(b.decodedValue)) return -1;
  if (a.decodedValue.gt(b.decodedValue)) return 1;
  return 0;
}

export function chooseMaximalConsistentSet(beacons: BeaconDecoded[]) {
  // It's either just one beacon data feed or we've eleminated rest of the beacons in the previous step
  if (beacons.length <= 1) return beacons;

  const sortedBeacons = [...beacons].sort(compareDecodedValue);
  let maxConsistent: BeaconDecoded[] = [];

  for (let start = 0; start < sortedBeacons.length; start++) {
    for (let end = start + 1; end < sortedBeacons.length; end++) {
      const tmpConsistent = sortedBeacons.slice(start, end + 1);
      const avg = tmpConsistent
        .reduce((sum, beacon) => sum.add(beacon.decodedValue), ethers.BigNumber.from(0))
        .div(ethers.BigNumber.from(tmpConsistent.length));
      const maxDeviation = avg.mul(ONE_PERCENT).div(HUNDRED_PERCENT);
      // Since the values are sorted, it's sufficient to check only the boundary values. If those pass all the values in between must pass as well.
      if (
        avg.sub(tmpConsistent.at(0)!.decodedValue).abs().lte(maxDeviation) &&
        avg.sub(tmpConsistent.at(-1)!.decodedValue).abs().lte(maxDeviation)
      ) {
        if (tmpConsistent.length > maxConsistent.length) {
          maxConsistent = tmpConsistent;
        }
      }
    }
  }

  return maxConsistent;
}

export function verifySignOevDataRequest(
  beacons: Beacon[]
): VerificationResult<{ validUpdateValues: ethers.BigNumber[] }> {
  const majority = Math.floor(beacons.length / 2) + 1;
  const airnodeWallet = getAirnodeWalletFromPrivateKey();
  const airnodeAddress = airnodeWallet.address;

  if (!beacons.find((beacon) => beacon.airnodeAddress === airnodeAddress)) {
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Missing signed beacon data from the Airnode requested for signing' },
    };
  }

  const validBeacons = dropInvalidBeacons(beacons);
  if (validBeacons.length < majority) {
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Not enough valid signed beacon data to proceed' },
    };
  }

  const consistentBeacons = chooseMaximalConsistentSet(validBeacons);
  if (consistentBeacons.length < majority) {
    return {
      success: false,
      statusCode: 400,
      error: { message: 'Not enough signed beacon data within the deviation threshold to proceed' },
    };
  }

  return { success: true, validUpdateValues: map(consistentBeacons, 'decodedValue') };
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
