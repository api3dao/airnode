import { BigNumber } from 'ethers';
import { calculateMedian, deriveBeaconId, deriveBeaconSetId, signOevData } from './sign-oev-data';
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
  const validUpdateValues = [BigNumber.from(100), BigNumber.from(150), BigNumber.from(200)];
  const timestamp = 1677753822;
  // oevUpdateHash: 0xf29974946b92c9a49b09c6d290b2073de9d932665a567c13e13f1e3ea716df55
  const signatures = [
    '0x2a20562ff1c0fa985eea09e33e1902140acf8f17c2c4bbbcaf98ad4ba2417c4a18d0bc293750bc195e45b0d33a8b71628abbdcc7296a550aaeb8c7c2cc29fbb11b',
    '0xcd29b94e503107fed316363e27a94eb55829c09b9d89f6594de8b24b05e2e44e4a365f1f8890acb36a003d00c091aef6c2288f72e0ebb96ec7ee307828fb64e81b',
  ];

  let dateNowSpy: jest.SpyInstance;

  beforeAll(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => timestamp * 1000);
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  it('signs the OEV data for one beacon', async () => {
    // median: 0x0000000000000000000000000000000000000000000000000000000000000064
    // oevUpdateHash: 0xc3789fe6050b1b9a77e15920048a1eaa4a84b80f3d09804f4a5ad7ed5d7e27af
    const oneBeaconSignedData = [requestBody.signedData[0]];
    const oneBeaconUpdateValues = [validUpdateValues[0]];
    const signedOevData = await signOevData({ ...requestBody, signedData: oneBeaconSignedData }, oneBeaconUpdateValues);
    const [err, res] = signedOevData;
    const [signedData] = res!.data;

    expect(err).toBeNull();
    expect(res!.success).toBeTruthy();
    expect(signedData.encodedValue).toEqual('0x0000000000000000000000000000000000000000000000000000000000000064');
    expect(signedData.signature).toEqual(
      '0x31a5fa78a05e619f304e8949f65e084c9d368b282d3d7e270178749bb072c7e92e52c722bc604120cd3a2d81071318bc6da17376b23721d088d75737072a3e3b1c'
    );
    expect(signedData.timestamp).toEqual(`${timestamp}`);
  });

  it('signs the OEV data for beacon set', async () => {
    const signedOevData = await signOevData(requestBody, validUpdateValues);
    const [err, res] = signedOevData;
    const [signedData1, signedData2] = res!.data;

    expect(err).toBeNull();
    expect(res!.success).toBeTruthy();
    expect(signedData1.encodedValue).toEqual('0x0000000000000000000000000000000000000000000000000000000000000096');
    expect(signedData1.signature).toEqual(signatures[0]);
    expect(signedData1.timestamp).toEqual(`${timestamp}`);
    expect(signedData2.encodedValue).toEqual('0x0000000000000000000000000000000000000000000000000000000000000096');
    expect(signedData2.signature).toEqual(signatures[1]);
    expect(signedData2.timestamp).toEqual(`${timestamp}`);
  });
});
