import { readFileSync } from 'fs';
import { join } from 'path';
import { subMinutes } from 'date-fns';
import { ethers } from 'ethers';
import omit from 'lodash/omit';
import map from 'lodash/map';
import { Config } from '@api3/airnode-node';
import {
  verifyHttpRequest,
  verifyHttpSignedDataRequest,
  checkRequestOrigin,
  verifyRequestOrigin,
  buildCorsHeaders,
  verifySignOevDataRequest,
  validateAndDecodeBeacons,
  allBeaconsConsistent,
} from './validation';
import * as fixtures from '../../../test/fixtures';

const loadConfigFixture = (): Config =>
  // We type the result as "Config", however it will not pass validation in it's current state because the secrets are
  // not interpolated
  JSON.parse(readFileSync(join(__dirname, '../../../test/fixtures/config/config.valid.json')).toString());

const validEndpointId = '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4';
const validDecodedBeacons = [
  {
    // beaconId: 0x1032c3cbea7692429f3f1bdb72c47b5c61bdd3ca995a763027f8aa511b42b11b
    // templateId: 0x64a8f8e70cd1bd4e4621bde25053bf4e22633241effa9f768bf18ff6400dc702
    airnodeAddress: '0x9A2Df85E73851e27044504d72563696E5cE86B95',
    endpointId: '0xa473a7ca2d5211e6e5766cc6a27c6e90a4f0270f13565e303c56a629815ed60a',
    encodedParameters:
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000657468657265756d000000000000000000000000000000000000000000000000',
    timestamp: '1677747253',
    encodedValue: '0x00000000000000000000000000000000000000000000000000000000000003e8', // 1000
    signature:
      '0x38250a8ef33f76d0994339a9c55af51c46c99d6610e48871d025d8d7931cd13e17399eda87efa0f16bdc0fc1df52772bbb9e00f1ac995a0cc1b65bcefeb795721b',
    decodedValue: ethers.BigNumber.from(1000),
  },
  {
    // beaconId: 0xd6965b1162b263e4dac3084ff0589614a464ac3e4ca012cb90ebb73094f7204e
    // templateId: 0x306c24b3373f82f267e678464c3bbca29ca5657d0cc6fa4e92981ff91e7c97f3
    airnodeAddress: '0x9A2Df85E73851e27044504d72563696E5cE86B95',
    endpointId: '0x6c0d51132b51cfca233be8f652189a62d1d9e3d7e0fed3dd2f131ebbf01d31d5',
    encodedParameters:
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
    timestamp: '1677747310',
    encodedValue: '0x00000000000000000000000000000000000000000000000000000000000003e9', // 1001
    signature:
      '0x1e8255929c001dfe2465d171c9757b49ceca00b70c964bf467e8fc57e573f7d538ffbb36c7ce88c9696c5363af4df76386e880ab13e5cf847ac73a45f645c92b1c',
    decodedValue: ethers.BigNumber.from(1001),
  },
  {
    // beaconId: 0xac1054d456689fa9d63e70d6a39b2f3896f494a544865969f1de6d3a61bf10ed
    // templateId: 0xf13fcbc7e9b814d6f42ca68793c4c5843950d7d77f4c54105669468efc7bb8a0
    airnodeAddress: '0xc89216a9adFA290354eB5365C3d5de6B6A24296a',
    endpointId: '0x0441ead8bafbca489e41d994bdde04d233b88423d93bd789651f2dd60d11f752',
    encodedParameters:
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000646f6765636f696e000000000000000000000000000000000000000000000000',
    timestamp: '1677747379',
    encodedValue: '0x00000000000000000000000000000000000000000000000000000000000003ea', // 1002
    signature:
      '0xdfc5f246c23815bf14f2eeb85f7871d2ed2832f7031848cf1ae33d32f7769c891492a07f2942824dbc2fc3ecaad057807e01111d6d1b8fe90618ead9f70177641b',
    decodedValue: ethers.BigNumber.from(1002),
  },
];
const validBeacons = validDecodedBeacons.map((decodedBeacon) => omit(decodedBeacon, 'decodedValue'));

describe('verifyHttpRequest', () => {
  it('returns error when the endpoint ID is not found', () => {
    const config = loadConfigFixture();
    const nonExistentEndpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff';

    const result = verifyHttpRequest(config, { coinId: 'bitcoin' }, nonExistentEndpointId);

    expect(result).toEqual({
      error: {
        message: "Unable to find endpoint with ID:'0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff'",
      },
      statusCode: 400,
      success: false,
    });
  });

  it('returns error when the parameters are invalid', () => {
    const config = loadConfigFixture();

    const result = verifyHttpRequest(config, { nonStringValue: 123 }, validEndpointId);

    expect(result).toEqual({
      error: { message: 'Invalid request body' },
      statusCode: 400,
      success: false,
    });
  });

  it('returns success when the data is valid', () => {
    const config = loadConfigFixture();

    const result = verifyHttpRequest(config, { coinId: 'bitcoin' }, validEndpointId);

    expect(result).toEqual({
      success: true,
      endpointId: '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4',
      parameters: {
        coinId: 'bitcoin',
      },
    });
  });
});

describe('verifyHttpSignedDataRequest', () => {
  it('returns error when the endpoint ID is not found', () => {
    const config = loadConfigFixture();
    const nonExistentEndpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff';

    const result = verifyHttpSignedDataRequest(
      config,
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
      nonExistentEndpointId
    );

    expect(result).toEqual({
      error: {
        message: "Unable to find endpoint with ID:'0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff'",
      },
      statusCode: 400,
      success: false,
    });
  });

  it('returns error when the encoded parameters are invalid', () => {
    const config = loadConfigFixture();

    const result = verifyHttpSignedDataRequest(config, '0x-Clearly-Invalid', validEndpointId);

    expect(result).toEqual({
      error: { message: 'Request contains invalid encodedParameters: 0x-Clearly-Invalid' },
      statusCode: 400,
      success: false,
    });
  });

  it('returns success when the data is valid', () => {
    const config = loadConfigFixture();

    const result = verifyHttpSignedDataRequest(
      config,
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
      validEndpointId
    );

    expect(result).toEqual({
      success: true,
      encodedParameters:
        '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
      endpointId: '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4',
    });
  });
});

describe('validateAndDecodeBeacons', () => {
  const currentTimestamp = 1677790659;
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(currentTimestamp);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns beacons with decoded value', () => {
    expect(validateAndDecodeBeacons(validBeacons)).toEqual(validDecodedBeacons);
  });

  it('returns null if some beacons have old timestamp', () => {
    const outdatedBeacons = [
      { ...validBeacons[0], timestamp: `${subMinutes(currentTimestamp, 2).getTime() - 1}` },
      ...validBeacons.slice(1),
    ];

    expect(validateAndDecodeBeacons(outdatedBeacons)).toBeNull();
  });

  it('returns null if some beacons have invalid encoded parameters', () => {
    const outdatedBeacons = [
      { ...validBeacons[0], encodedParameters: 'invalid encoded parameters' },
      ...validBeacons.slice(1),
    ];

    expect(validateAndDecodeBeacons(outdatedBeacons)).toBeNull();
  });

  it('returns null if some beacons have invalid signature', () => {
    const outdatedBeacons = [
      {
        ...validBeacons[0],
        signature:
          '0x9122514d1cb4598435ea21afb7790d9daf5850b87673872b7ddf9e8df7a6afb3106a9f93557429b2b8bca4c9c57e103b93ab0de11f7bec8feeca1968189bffffff',
      },
      ...validBeacons.slice(1),
    ];

    expect(validateAndDecodeBeacons(outdatedBeacons)).toBeNull();
  });

  it('returns null if some beacons have invalid encoded value', () => {
    const outdatedBeacons = [{ ...validBeacons[0], encodedValue: 'invalid encoded value' }, ...validBeacons.slice(1)];

    expect(validateAndDecodeBeacons(outdatedBeacons)).toBeNull();
  });

  it('returns null if some beacons have value out of range', () => {
    const outdatedBeacons = [
      { ...validBeacons[0], encodedValue: '0xffffffff00000000000000000000000000000000000000000000000000000000' },
      ...validBeacons.slice(1),
    ];

    expect(validateAndDecodeBeacons(outdatedBeacons)).toBeNull();
  });
});

describe('allBeaconsConsistent', () => {
  const validTestCases = [
    [1000, 1001, 1002],
    [1000, 1001, 1002],
    [5],
    [0],
    [99, 99, 99, 101, 101, 101],
    // Test is passing due to rounding done by BigNumber. In practice this won't be a problem as the numbers used will most likely be > 10^6.
    [99, 101, 101, 101, 101, 101, 101],
  ];

  const invalidTestCases = [
    [1000, 1001, 1002, 5000],
    [1000, 5000, 1001, 1002],
    [5000, 1000, 1001, 1002],
    [1, 2, 3],
    [98, 101, 101, 101, 101, 101, 101],
  ];

  validTestCases.forEach((testCase) => {
    it(`for input ${testCase[0]} returns ${testCase[1]}`, () => {
      const decodedTestCase = testCase.map((value) => ({
        ...validBeacons[0],
        decodedValue: ethers.BigNumber.from(value),
      }));

      expect(allBeaconsConsistent(decodedTestCase)).toBeTruthy();
    });
  });

  invalidTestCases.forEach((testCase) => {
    it(`for input ${testCase[0]} returns 'false'`, () => {
      const decodedTestCase = testCase.map((value) => ({
        ...validBeacons[0],
        decodedValue: ethers.BigNumber.from(value),
      }));

      expect(allBeaconsConsistent(decodedTestCase)).toBeFalsy();
    });
  });
});

describe('verifySignOevDataRequest', () => {
  fixtures.setEnvVariables({
    AIRNODE_WALLET_PRIVATE_KEY: '0xac3c08943f8be529b66660c4b12d488814c129b53a343082c99e6626e42d6d8c',
  });
  const missingDataBeacon = omit(validBeacons[0], 'encodedValue');
  const oldTimestampBeacon = { ...validBeacons[0], timestamp: '1677740000' };
  const invalidEncodedParametersBeacon = { ...validBeacons[0], encodedParameters: 'invalid' };
  const invalidEncodedValueBeacon = { ...validBeacons[0], encodedValue: 'invalid' };
  const signatureMismatchBeacon = {
    ...validBeacons[0],
    signature:
      '0xdfc5f246c23815bf14f2eeb85f7871d2ed2832f7031848cf1ae33d32f7769c891492a07f2942824dbc2fc3ecaad057807e01111d6d1b8fe90618ead9f70177641b',
  };
  const outOfThresholdBeacon = {
    ...validBeacons[0],
    encodedValue: '0x00000000000000000000000000000000000000000000000000000000000007d0', // 2000
    signature:
      '0xc60d89ab00348cced9e1daa050694ac01ba50b3608dcf6ee556d625bf56fdd54697e76358742c0845f1dcf1930e1f612235291572c7445cabccaf167e2ee95511c',
  };

  const expectedDecodedValues = [1000, 1001, 1002].map(ethers.BigNumber.from);
  const expectedTimestamps = map(validBeacons, 'timestamp');

  const currentTimestamp = 1677790659;
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(currentTimestamp);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('verifies beacon data for the request', () => {
    expect(verifySignOevDataRequest(validBeacons)).toEqual({
      success: true,
      validUpdateValues: expectedDecodedValues,
      validUpdateTimestamps: expectedTimestamps,
    });
  });

  it('fails if majority of beacons are missing data', () => {
    expect(verifySignOevDataRequest([validBeacons[0], missingDataBeacon])).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with data to proceed' },
    });
  });

  it('fails if there is no beacon related to the processing Airnode', () => {
    expect(verifySignOevDataRequest([validBeacons[2]])).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Missing beacon data from the Airnode requested for signing' },
    });
  });

  it('fails if there are beacons with old timestamp', () => {
    expect(verifySignOevDataRequest([...validBeacons, oldTimestampBeacon])).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with valid data to proceed' },
    });
  });

  it('fails if there are beacons with invalid encoded parameters', () => {
    expect(verifySignOevDataRequest([...validBeacons, invalidEncodedParametersBeacon])).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with valid data to proceed' },
    });
  });

  it('fails if there are beacons with invalid encoded value', () => {
    expect(verifySignOevDataRequest([...validBeacons, invalidEncodedValueBeacon])).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with valid data to proceed' },
    });
  });

  it('fails if there are beacons with invalid signature', () => {
    expect(verifySignOevDataRequest([...validBeacons, signatureMismatchBeacon])).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with valid data to proceed' },
    });
  });

  it('fails if there are beacons with a value out of deviation threshold', () => {
    expect(verifySignOevDataRequest([...validBeacons, outOfThresholdBeacon])).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough valid beacon data within the deviation threshold to proceed' },
    });
  });

  it('verifies one valid beacon data', () => {
    expect(verifySignOevDataRequest([validBeacons[0]])).toEqual({
      success: true,
      validUpdateValues: [expectedDecodedValues[0]],
      validUpdateTimestamps: [expectedTimestamps[0]],
    });
  });
});

describe('cors', () => {
  const origin = 'https://origin.com';
  const notAllowedOrigin = 'https://notallowed.com';
  const allAllowedOrigin = '*';

  describe('buildCorsHeaders', () => {
    it('returns headers with input origin', () => {
      const headers = buildCorsHeaders(origin);
      expect(headers).toEqual({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
    });
  });

  describe('checkRequestOrigin', () => {
    it('returns allowed origin', () => {
      const allowedOrigin = checkRequestOrigin([origin], origin);
      expect(allowedOrigin).toEqual(origin);
    });

    it('returns allow all origins', () => {
      const allowedOrigin = checkRequestOrigin([allAllowedOrigin], origin);
      expect(allowedOrigin).toEqual(allAllowedOrigin);
    });

    it('returns undefined if no allowed origin match', () => {
      const allowedOrigin = checkRequestOrigin([origin], notAllowedOrigin);
      expect(allowedOrigin).toBeUndefined();
    });

    it('returns undefined if empty allowedOrigins', () => {
      const allowedOrigin = checkRequestOrigin([], notAllowedOrigin);
      expect(allowedOrigin).toBeUndefined();
    });
  });

  describe('verifyRequestOrigin', () => {
    it('handles disabling cors', () => {
      const originVerification = verifyRequestOrigin([], notAllowedOrigin);
      expect(originVerification).toEqual({ success: false, error: { message: 'CORS origin verification failed.' } });
    });
    it('handles allow all origins', () => {
      const originVerification = verifyRequestOrigin([allAllowedOrigin], notAllowedOrigin);
      expect(originVerification).toEqual({ success: true, headers: buildCorsHeaders(allAllowedOrigin) });
    });

    it('handles allowed origin', () => {
      const originVerification = verifyRequestOrigin([origin], origin);
      expect(originVerification).toEqual({ success: true, headers: buildCorsHeaders(origin) });
    });
  });
});
