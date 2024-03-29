import { signOevData } from './sign-oev-data';
import * as fixtures from '../../test/fixtures';

describe('signOevData', () => {
  fixtures.setEnvVariables({
    AIRNODE_WALLET_PRIVATE_KEY: '0xac3c08943f8be529b66660c4b12d488814c129b53a343082c99e6626e42d6d8c',
  });

  const beacons = [
    {
      beaconId: '0x1032c3cbea7692429f3f1bdb72c47b5c61bdd3ca995a763027f8aa511b42b11b',
      templateId: '0x64a8f8e70cd1bd4e4621bde25053bf4e22633241effa9f768bf18ff6400dc702',
      airnodeAddress: '0x9A2Df85E73851e27044504d72563696E5cE86B95',
      timestamp: '1677747253',
      encodedValue: '0x0000000000000000000000000000000000000000000000000000000000000064', // 100
      signature:
        '0x9122514d1cb4598435ea21afb7790d9daf5850b87673872b7ddf9e8df7a6afb3106a9f93557429b2b8bca4c9c57e103b93ab0de11f7bec8feeca1968189bbd8f1b',
    },
    {
      beaconId: '0xd6965b1162b263e4dac3084ff0589614a464ac3e4ca012cb90ebb73094f7204e',
      templateId: '0x306c24b3373f82f267e678464c3bbca29ca5657d0cc6fa4e92981ff91e7c97f3',
      airnodeAddress: '0x9A2Df85E73851e27044504d72563696E5cE86B95',
      timestamp: '1677747310',
      encodedValue: '0x0000000000000000000000000000000000000000000000000000000000000096', // 150
      signature:
        '0x64c19621c8c9a8c2ad722f9f6edd15d524302a0d502a549519de8df1b612410f73cdc0a668df63bc2447923cfc89c1c5101679423f6895b15c034eb35657d70f1b',
    },
    {
      beaconId: '0xac1054d456689fa9d63e70d6a39b2f3896f494a544865969f1de6d3a61bf10ed',
      templateId: '0xf13fcbc7e9b814d6f42ca68793c4c5843950d7d77f4c54105669468efc7bb8a0',
      airnodeAddress: '0xc89216a9adFA290354eB5365C3d5de6B6A24296a',
      timestamp: '1677747379',
      encodedValue: '0x00000000000000000000000000000000000000000000000000000000000000c8', // 200
      signature:
        '0xeb23778ec61b3aea071d4f1a8fbff002d7ed8242628ce603949a244855a388110b9fd792b48ce81558e04029f52991184569ed43b671cd7057c3502c8e196fce1b',
    },
    // beaconSetId: 0xed1b3e094ecdba3445315617bc8f0dd5356cf85b8e7644144bce5d717b41a344
  ];

  it('signs the OEV data for one beacon', async () => {
    const oneBeaconSignedData = [beacons[0]];
    const signedOevData = await signOevData(
      oneBeaconSignedData,
      '0xf6675230e0269c8308f219e520f91a3a665e0b48b408047445e218369642d5af'
    );
    const [err, res] = signedOevData;

    expect(err).toBeNull();
    expect(res!.success).toBeTruthy();
    expect(res!.data).toEqual([
      '0xe88e4110be68b36b8416b87135c894951724b3cc140fd0a2fe7d0d51cc73dcff2bc6cd8bcf69adb39b3b01304e266ad1b81291e8214466af0c418e1b702168ba1b',
    ]);
  });

  it('signs the OEV data for beacon set', async () => {
    const signedOevData = await signOevData(
      beacons,
      '0xcd5bb3b413773277e8b03a10c3213fb752ad9d7c4d286ce8826b73905ba0672c'
    );
    const [err, res] = signedOevData;

    expect(err).toBeNull();
    expect(res!.success).toBeTruthy();
    expect(res!.data).toEqual([
      '0xf990802abc67a45b901bc30084c472b43937e0d2d67e76b352d8841ac80fe0c54d2e95252a4921a61daf3783f24b3d7e7e7479a2cae7e22ae4aea314fda5d8f91b',
      '0xd6264e508ec92085a96c15b27d11e1e228b8afd06b57c039efe836df92f247a9660862c030eb38c9549a69dacb7ed2daf5c1140a2af92f0cffbd1419a04286061c',
    ]);
  });
});
