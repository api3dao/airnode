import { readFileSync } from 'fs';
import { join } from 'path';
import { subMinutes } from 'date-fns';
import { ethers } from 'ethers';
import omit from 'lodash/omit';
import { Config } from '@api3/airnode-node';
import {
  verifyHttpRequest,
  verifyHttpSignedDataRequest,
  checkRequestOrigin,
  verifyRequestOrigin,
  buildCorsHeaders,
  verifySignOevDataRequest,
  decodeBeaconsWithData,
  allBeaconsConsistent,
  BeaconDecoded,
  deriveBeaconId,
  deriveBeaconSetId,
  calculateMedian,
  calculateUpdateTimestamp,
  ProcessSignOevDataRequestBody,
  BeaconWithIds,
  validateBeacons,
} from './validation';
import * as fixtures from '../../../test/fixtures';

const loadConfigFixture = (): Config =>
  // We type the result as "Config", however it will not pass validation in it's current state because the secrets are
  // not interpolated
  JSON.parse(readFileSync(join(__dirname, '../../../test/fixtures/config/config.valid.json')).toString());

const validEndpointId = '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4';
const validDecodedBeacons = [
  {
    beaconId: '0x1032c3cbea7692429f3f1bdb72c47b5c61bdd3ca995a763027f8aa511b42b11b',
    templateId: '0x64a8f8e70cd1bd4e4621bde25053bf4e22633241effa9f768bf18ff6400dc702',
    airnodeAddress: '0x9A2Df85E73851e27044504d72563696E5cE86B95',
    endpointId: '0xa473a7ca2d5211e6e5766cc6a27c6e90a4f0270f13565e303c56a629815ed60a',
    encodedParameters:
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000657468657265756d000000000000000000000000000000000000000000000000',
    signedData: {
      timestamp: '1677747253',
      encodedValue: '0x00000000000000000000000000000000000000000000000000000000000003e8', // 1000
      signature:
        '0x38250a8ef33f76d0994339a9c55af51c46c99d6610e48871d025d8d7931cd13e17399eda87efa0f16bdc0fc1df52772bbb9e00f1ac995a0cc1b65bcefeb795721b',
    },
    decodedValue: ethers.BigNumber.from(1000),
  },
  {
    beaconId: '0xd6965b1162b263e4dac3084ff0589614a464ac3e4ca012cb90ebb73094f7204e',
    templateId: '0x306c24b3373f82f267e678464c3bbca29ca5657d0cc6fa4e92981ff91e7c97f3',
    airnodeAddress: '0x9A2Df85E73851e27044504d72563696E5cE86B95',
    endpointId: '0x6c0d51132b51cfca233be8f652189a62d1d9e3d7e0fed3dd2f131ebbf01d31d5',
    encodedParameters:
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
    signedData: {
      timestamp: '1677747310',
      encodedValue: '0x00000000000000000000000000000000000000000000000000000000000003e9', // 1001
      signature:
        '0x1e8255929c001dfe2465d171c9757b49ceca00b70c964bf467e8fc57e573f7d538ffbb36c7ce88c9696c5363af4df76386e880ab13e5cf847ac73a45f645c92b1c',
    },
    decodedValue: ethers.BigNumber.from(1001),
  },
  {
    beaconId: '0xac1054d456689fa9d63e70d6a39b2f3896f494a544865969f1de6d3a61bf10ed',
    templateId: '0xf13fcbc7e9b814d6f42ca68793c4c5843950d7d77f4c54105669468efc7bb8a0',
    airnodeAddress: '0xc89216a9adFA290354eB5365C3d5de6B6A24296a',
    endpointId: '0x0441ead8bafbca489e41d994bdde04d233b88423d93bd789651f2dd60d11f752',
    encodedParameters:
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000646f6765636f696e000000000000000000000000000000000000000000000000',
    signedData: {
      timestamp: '1677747379',
      encodedValue: '0x00000000000000000000000000000000000000000000000000000000000003ea', // 1002
      signature:
        '0xdfc5f246c23815bf14f2eeb85f7871d2ed2832f7031848cf1ae33d32f7769c891492a07f2942824dbc2fc3ecaad057807e01111d6d1b8fe90618ead9f70177641b',
    },
    decodedValue: ethers.BigNumber.from(1002),
  },
] satisfies BeaconDecoded[];
const validBeaconsWithIds = validDecodedBeacons.map<Required<BeaconWithIds>>((decodedBeacon) =>
  omit(decodedBeacon, 'decodedValue')
);
const validRequestBody: ProcessSignOevDataRequestBody = {
  chainId: 31337,
  dapiServerAddress: '0x720D8B97a6B90AB8a53358447Df5cf28A9391Ab4',
  oevProxyAddress: '0x9AA42184aFD00c9599CE05748E2199F8f083036b',
  updateId: '0x3039656530346630306130383438646138323665616363636538343664303000',
  bidderAddress: '0xb5c062D4d799b85B4e29c274F9570Fd8216AED68',
  bidAmount: '0x0000000000000000000000000000000000000000000000000000000a571a14c0',
  beacons: validBeaconsWithIds.map((beacon) => omit(beacon, ['templateId', 'beaconId'])),
};

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

describe('decodeBeaconsWithData', () => {
  const currentTimestamp = 1677790659;
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(currentTimestamp);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns beacons with decoded value', () => {
    expect(decodeBeaconsWithData(validBeaconsWithIds)).toEqual(validDecodedBeacons);
  });

  it('returns null if some beacons have old timestamp', () => {
    const outdatedBeacons: Required<BeaconWithIds>[] = [
      {
        ...validBeaconsWithIds[0],
        signedData: {
          ...validBeaconsWithIds[0].signedData,
          timestamp: `${subMinutes(currentTimestamp, 2).getTime() - 1}`,
        },
      },
      ...validBeaconsWithIds.slice(1),
    ];

    expect(decodeBeaconsWithData(outdatedBeacons)).toBeNull();
  });

  it('returns null if some beacons have invalid signature', () => {
    const invalidSignatureBeacons: Required<BeaconWithIds>[] = [
      {
        ...validBeaconsWithIds[0],
        signedData: {
          ...validBeaconsWithIds[0].signedData,
          signature:
            '0x9122514d1cb4598435ea21afb7790d9daf5850b87673872b7ddf9e8df7a6afb3106a9f93557429b2b8bca4c9c57e103b93ab0de11f7bec8feeca1968189bffffff',
        },
      },
      ...validBeaconsWithIds.slice(1),
    ];

    expect(decodeBeaconsWithData(invalidSignatureBeacons)).toBeNull();
  });

  it('returns null if some beacons have invalid encoded value', () => {
    const invalidEncodedValue: Required<BeaconWithIds>[] = [
      {
        ...validBeaconsWithIds[0],
        signedData: { ...validBeaconsWithIds[0].signedData, encodedValue: 'invalid encoded value' },
      },
      ...validBeaconsWithIds.slice(1),
    ];

    expect(decodeBeaconsWithData(invalidEncodedValue)).toBeNull();
  });

  it('returns null if some beacons have value out of range', () => {
    const valueOutOfRangeBeacons: Required<BeaconWithIds>[] = [
      {
        ...validBeaconsWithIds[0],
        signedData: {
          ...validBeaconsWithIds[0].signedData,
          encodedValue: '0xffffffff00000000000000000000000000000000000000000000000000000000',
        },
      },
      ...validBeaconsWithIds.slice(1),
    ];

    expect(decodeBeaconsWithData(valueOutOfRangeBeacons)).toBeNull();
  });
});

describe('validateBeacons', () => {
  it('returns beacons with beacon ID and template ID if they are valid', () => {
    const beacon = validBeaconsWithIds[0];

    expect(validateBeacons([validRequestBody.beacons[0]])).toEqual([beacon]);
  });

  it('returns null if some beacons have invalid encoded parameters', () => {
    expect(
      validateBeacons([{ ...validRequestBody.beacons[0], encodedParameters: 'invalid encoded parameters' }])
    ).toBeNull();
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
        ...validBeaconsWithIds[0],
        decodedValue: ethers.BigNumber.from(value),
      }));

      expect(allBeaconsConsistent(decodedTestCase)).toBeTruthy();
    });
  });

  invalidTestCases.forEach((testCase) => {
    it(`for input ${testCase[0]} returns 'false'`, () => {
      const decodedTestCase = testCase.map((value) => ({
        ...validBeaconsWithIds[0],
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
  const missingDataBeacon: BeaconWithIds = omit(validBeaconsWithIds[0], 'signedData');
  const oldTimestampBeacon: BeaconWithIds = {
    ...validBeaconsWithIds[0],
    signedData: { ...validBeaconsWithIds[0].signedData, timestamp: '1677740000' },
  };
  const invalidEncodedParametersBeacon: BeaconWithIds = { ...validBeaconsWithIds[0], encodedParameters: 'invalid' };
  const invalidEncodedValueBeacon: BeaconWithIds = {
    ...validBeaconsWithIds[0],
    signedData: { ...validBeaconsWithIds[0].signedData, encodedValue: 'invalid' },
  };
  const signatureMismatchBeacon: BeaconWithIds = {
    ...validBeaconsWithIds[0],
    signedData: {
      ...validBeaconsWithIds[0].signedData,
      signature:
        '0xdfc5f246c23815bf14f2eeb85f7871d2ed2832f7031848cf1ae33d32f7769c891492a07f2942824dbc2fc3ecaad057807e01111d6d1b8fe90618ead9f70177641b',
    },
  };
  const outOfThresholdBeacon: BeaconWithIds = {
    ...validBeaconsWithIds[0],
    signedData: {
      ...validBeaconsWithIds[0].signedData,
      encodedValue: '0x00000000000000000000000000000000000000000000000000000000000007d0', // 2000
      signature:
        '0xc60d89ab00348cced9e1daa050694ac01ba50b3608dcf6ee556d625bf56fdd54697e76358742c0845f1dcf1930e1f612235291572c7445cabccaf167e2ee95511c',
    },
  };

  const currentTimestamp = 1677790659;
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(currentTimestamp);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('verifies beacon data for beacon set', () => {
    expect(verifySignOevDataRequest(validRequestBody)).toEqual({
      success: true,
      oevUpdateHash: '0x740a60717fe14aea180ca27ad1001ceb172cf873298f7f77656e6c561320dfbb',
      beacons: validDecodedBeacons,
    });
  });

  it('verifies beacon data for single beacon', () => {
    expect(verifySignOevDataRequest({ ...validRequestBody, beacons: [validRequestBody.beacons[0]] })).toEqual({
      success: true,
      oevUpdateHash: '0x7902fa7f7a466b46c0ddededa556076e6ddc8dd5bdb3bc7ccbf3065519180eef',
      beacons: [validDecodedBeacons[0]],
    });
  });

  it('fails if majority of beacons are missing data', () => {
    expect(
      verifySignOevDataRequest({
        beacons: [missingDataBeacon, validRequestBody.beacons[1]],
      } as ProcessSignOevDataRequestBody)
    ).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with data to proceed' },
    });
  });

  it('fails if there is no beacon related to the processing Airnode', () => {
    expect(
      verifySignOevDataRequest({
        beacons: [validRequestBody.beacons[2]],
      } as ProcessSignOevDataRequestBody)
    ).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Missing beacon data from the Airnode requested for signing' },
    });
  });

  it('fails if there are beacons with old timestamp', () => {
    expect(
      verifySignOevDataRequest({
        beacons: [...validRequestBody.beacons, oldTimestampBeacon],
      } as ProcessSignOevDataRequestBody)
    ).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with valid data to proceed' },
    });
  });

  it('fails if there are beacons with invalid encoded parameters', () => {
    expect(
      verifySignOevDataRequest({
        beacons: [...validRequestBody.beacons, invalidEncodedParametersBeacon],
      } as ProcessSignOevDataRequestBody)
    ).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Some of the beacons are invalid' },
    });
  });

  it('fails if there are beacons with invalid encoded value', () => {
    expect(
      verifySignOevDataRequest({
        beacons: [...validRequestBody.beacons, invalidEncodedValueBeacon],
      } as ProcessSignOevDataRequestBody)
    ).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with valid data to proceed' },
    });
  });

  it('fails if there are beacons with invalid signature', () => {
    expect(
      verifySignOevDataRequest({
        beacons: [...validRequestBody.beacons, signatureMismatchBeacon],
      } as ProcessSignOevDataRequestBody)
    ).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Not enough beacons with valid data to proceed' },
    });
  });

  it('fails if there are beacons with a value out of deviation threshold', () => {
    expect(
      verifySignOevDataRequest({
        beacons: [...validRequestBody.beacons, outOfThresholdBeacon],
      } as ProcessSignOevDataRequestBody)
    ).toEqual({
      success: false,
      statusCode: 400,
      error: { message: 'Inconsistent beacon data' },
    });
  });

  it('fails if update hash cannot be derived', () => {
    expect(verifySignOevDataRequest({ ...validRequestBody, updateId: 'invalid-update-id' })).toEqual({
      success: false,
      statusCode: 400,
      error: {
        message: 'Error deriving OEV update hash',
      },
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

describe('deriveBeaconId', () => {
  const airnodeAddress = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace';
  const templateId = '0x5fadf775c50d6ec9641b9d07ab3a9ca9d92aaf64d27ea54529fb7d8ebc72e713';

  it('correctly derives beacon ID', () => {
    expect(deriveBeaconId(airnodeAddress, templateId)).toEqual(
      '0xbc80cbd7a8b8180e11d189a8334814a44a69c4d083b31305ecf67a3a3ea0fd9a'
    );
  });
});

describe('deriveBeaconSetId', () => {
  const beaconIds = [
    '0xbc80cbd7a8b8180e11d189a8334814a44a69c4d083b31305ecf67a3a3ea0fd9a',
    '0x717d60cb328ef7ea138ae1b31c78a03fe6caa1a05568b1649e89cd924321b732',
  ];

  it('correctly derives beacon ID', () => {
    expect(deriveBeaconSetId(beaconIds)).toEqual('0x786c4a7929a666c77ba5d4d3ce7ed61f2ba9885525f0a7577f014641568926fe');
  });
});

describe('calculateMedian', () => {
  describe('for array with odd number of elements', () => {
    it('calculates median for sorted array', () => {
      const arr = [10, 11, 24, 30, 47].map(ethers.BigNumber.from);
      expect(calculateMedian(arr)).toEqual(ethers.BigNumber.from(24));
    });

    it('calculates median for unsorted array', () => {
      const arr = [24, 11, 10, 47, 30].map(ethers.BigNumber.from);
      expect(calculateMedian(arr)).toEqual(ethers.BigNumber.from(24));
    });
  });

  describe('for array with even number of elements', () => {
    it('calculates median for sorted array', () => {
      const arr = [10, 11, 24, 30].map(ethers.BigNumber.from);
      expect(calculateMedian(arr)).toEqual(ethers.BigNumber.from(17));
    });

    it('calculates median for unsorted array', () => {
      const arr = [24, 11, 10, 30].map(ethers.BigNumber.from);
      expect(calculateMedian(arr)).toEqual(ethers.BigNumber.from(17));
    });
  });
});

describe('calculateUpdateTimestamp', () => {
  it('calculates beacon set timestamp', () => {
    const beaconSetBeaconTimestamps = ['1555711223', '1556229645', '1555020018', '1556402497'];
    expect(calculateUpdateTimestamp(beaconSetBeaconTimestamps)).toEqual(1555840845);
  });

  it('calculates beacon set timestamp from just one timestamp', () => {
    const beaconSetBeaconTimestamps = ['1555711223'];
    expect(calculateUpdateTimestamp(beaconSetBeaconTimestamps)).toEqual(1555711223);
  });
});
