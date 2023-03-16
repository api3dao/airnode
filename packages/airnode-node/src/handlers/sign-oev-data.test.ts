import map from 'lodash/map';
import { BigNumber } from 'ethers';
import {
  calculateMedian,
  calculateUpdateTimestamp,
  deriveBeaconId,
  deriveBeaconSetId,
  signOevData,
} from './sign-oev-data';
import * as fixtures from '../../test/fixtures';

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
      const arr = [10, 11, 24, 30, 47].map(BigNumber.from);
      expect(calculateMedian(arr)).toEqual(BigNumber.from(24));
    });

    it('calculates median for unsorted array', () => {
      const arr = [24, 11, 10, 47, 30].map(BigNumber.from);
      expect(calculateMedian(arr)).toEqual(BigNumber.from(24));
    });
  });

  describe('for array with even number of elements', () => {
    it('calculates median for sorted array', () => {
      const arr = [10, 11, 24, 30].map(BigNumber.from);
      expect(calculateMedian(arr)).toEqual(BigNumber.from(17));
    });

    it('calculates median for unsorted array', () => {
      const arr = [24, 11, 10, 30].map(BigNumber.from);
      expect(calculateMedian(arr)).toEqual(BigNumber.from(17));
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

// The commented values below (e.g. beaconId, templateId, ...) are there so we have easier time
// changing the tests in the future as the values in the tests must be derived correctly in order to pass
describe('signOevData', () => {
  fixtures.setEnvVariables({
    AIRNODE_WALLET_PRIVATE_KEY: '0xac3c08943f8be529b66660c4b12d488814c129b53a343082c99e6626e42d6d8c',
  });

  const requestBody = {
    chainId: 31337,
    dapiServerAddress: '0x720D8B97a6B90AB8a53358447Df5cf28A9391Ab4',
    oevProxyAddress: '0x9AA42184aFD00c9599CE05748E2199F8f083036b',
    updateId: '0x3039656530346630306130383438646138323665616363636538343664303000',
    bidderAddress: '0xb5c062D4d799b85B4e29c274F9570Fd8216AED68',
    bidAmount: '0x0000000000000000000000000000000000000000000000000000000a571a14c0',
    signedData: [
      {
        // beaconId: 0x1032c3cbea7692429f3f1bdb72c47b5c61bdd3ca995a763027f8aa511b42b11b
        // templateId: 0x64a8f8e70cd1bd4e4621bde25053bf4e22633241effa9f768bf18ff6400dc702
        airnodeAddress: '0x9A2Df85E73851e27044504d72563696E5cE86B95',
        endpointId: '0xa473a7ca2d5211e6e5766cc6a27c6e90a4f0270f13565e303c56a629815ed60a',
        encodedParameters:
          '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000657468657265756d000000000000000000000000000000000000000000000000',
        timestamp: '1677747253',
        encodedValue: '0x0000000000000000000000000000000000000000000000000000000000000064', // 100
        signature:
          '0x9122514d1cb4598435ea21afb7790d9daf5850b87673872b7ddf9e8df7a6afb3106a9f93557429b2b8bca4c9c57e103b93ab0de11f7bec8feeca1968189bbd8f1b',
      },
      {
        // beaconId: 0xd6965b1162b263e4dac3084ff0589614a464ac3e4ca012cb90ebb73094f7204e
        // templateId: 0x306c24b3373f82f267e678464c3bbca29ca5657d0cc6fa4e92981ff91e7c97f3
        airnodeAddress: '0x9A2Df85E73851e27044504d72563696E5cE86B95',
        endpointId: '0x6c0d51132b51cfca233be8f652189a62d1d9e3d7e0fed3dd2f131ebbf01d31d5',
        encodedParameters:
          '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
        timestamp: '1677747310',
        encodedValue: '0x0000000000000000000000000000000000000000000000000000000000000096', // 150
        signature:
          '0x64c19621c8c9a8c2ad722f9f6edd15d524302a0d502a549519de8df1b612410f73cdc0a668df63bc2447923cfc89c1c5101679423f6895b15c034eb35657d70f1b',
      },
      {
        // beaconId: 0xac1054d456689fa9d63e70d6a39b2f3896f494a544865969f1de6d3a61bf10ed
        // templateId: 0xf13fcbc7e9b814d6f42ca68793c4c5843950d7d77f4c54105669468efc7bb8a0
        airnodeAddress: '0xc89216a9adFA290354eB5365C3d5de6B6A24296a',
        endpointId: '0x0441ead8bafbca489e41d994bdde04d233b88423d93bd789651f2dd60d11f752',
        encodedParameters:
          '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000646f6765636f696e000000000000000000000000000000000000000000000000',
        timestamp: '1677747379',
        encodedValue: '0x00000000000000000000000000000000000000000000000000000000000000c8', // 200
        signature:
          '0xeb23778ec61b3aea071d4f1a8fbff002d7ed8242628ce603949a244855a388110b9fd792b48ce81558e04029f52991184569ed43b671cd7057c3502c8e196fce1b',
      },
      // beaconSetId: 0xed1b3e094ecdba3445315617bc8f0dd5356cf85b8e7644144bce5d717b41a344
    ],
  };
  // median: 0x0000000000000000000000000000000000000000000000000000000000000096
  const validUpdateValues = [100, 150, 200].map(BigNumber.from);
  const validUpdateTimestamps = map(requestBody.signedData, 'timestamp');
  // oevUpdateHash: 0xcd5bb3b413773277e8b03a10c3213fb752ad9d7c4d286ce8826b73905ba0672c
  const signatures = [
    '0x81b1512a67848c0d46ce6957f7b377dc43e9444a57f602353e5c9ab41a24c68d3a2c5a261f7d59e0bca0e72bdc7353bb20e2c4f801452ddd95c43c4f9c7e56581b',
    '0xc01e7da0e6e2a7057f5c95aefc327d34d85faf812876340b48b052a611d32ec61cae4fc1443d364bc4ee819eae00ff032dd904aaa8e169c52144b9c81a9c3fba1b',
  ];

  it('signs the OEV data for one beacon', async () => {
    // median: 0x0000000000000000000000000000000000000000000000000000000000000064
    // oevUpdateHash: 0xf6675230e0269c8308f219e520f91a3a665e0b48b408047445e218369642d5af
    const oneBeaconSignedData = [requestBody.signedData[0]];
    const oneBeaconUpdateValues = [validUpdateValues[0]];
    const oneBeaconUpdateTimestamps = [requestBody.signedData[0].timestamp];
    const signedOevData = await signOevData(
      { ...requestBody, signedData: oneBeaconSignedData },
      oneBeaconUpdateValues,
      oneBeaconUpdateTimestamps
    );
    const [err, res] = signedOevData;

    expect(err).toBeNull();
    expect(res!.success).toBeTruthy();
    expect(res!.data).toEqual([
      {
        signature:
          '0xa8339565d47b5a80ae35702df0a4656809dfc0152c9bbd22a8a94ce6501690e077ad3b5d1fa7f9198eff3db0b74b8196c30c0f931677e2a09ba5e2c96621b08b1b',
      },
    ]);
  });

  it('signs the OEV data for beacon set', async () => {
    const signedOevData = await signOevData(requestBody, validUpdateValues, validUpdateTimestamps);
    const [err, res] = signedOevData;

    expect(err).toBeNull();
    expect(res!.success).toBeTruthy();
    expect(res!.data).toEqual([
      {
        signature: signatures[0],
      },
      {
        signature: signatures[1],
      },
    ]);
  });
});
