import { AirnodeRrpFactory } from '@api3/protocol';
import { ethers } from 'ethers';
import difference from 'lodash/difference';
import * as admin from '../../src/implementation';
import { AdminSdk } from '../../src/sdk';

const PROVIDER_URL = 'http://127.0.0.1:8545/';

it('provides same API', async () => {
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
  const deployer = provider.getSigner(0);
  const airnodeRrp = await new AirnodeRrpFactory(deployer).deploy();
  expect(airnodeRrp.address).toBeDefined();

  const sdk = new AdminSdk(airnodeRrp);
  const sdkApi = difference(Object.keys(sdk), ['airnodeRrp']).sort();
  const sdkStaticApi = difference(Object.keys(AdminSdk), ['airnodeRrp']).sort();
  const adminApi = difference(Object.keys(admin), ['deriveWalletPathFromSponsorAddress', 'deriveEndpointId']).sort();

  expect(sdkApi).toEqual(adminApi);
  expect(sdkStaticApi).toEqual([
    'deriveEndpointId',
    'deriveWalletPathFromSponsorAddress',
    'getAirnodeRrp',
    'getAirnodeRrpWithSigner',
  ]);
});
