import {
  AccessControlRegistry,
  AccessControlRegistryFactory,
  RequesterAuthorizerWithAirnode,
  AirnodeRrpV0,
  AirnodeRrpV0Factory,
  authorizers,
} from '@api3/airnode-protocol';
import { ethers } from 'ethers';
import difference from 'lodash/difference';
import * as admin from '../../src/implementation';
import { AdminSdk } from '../../src/sdk';

const PROVIDER_URL = 'http://127.0.0.1:8545/';

describe('SDK', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let deployer: ethers.providers.JsonRpcSigner;
  let airnodeRrp: AirnodeRrpV0;
  let accessControlRegistry: AccessControlRegistry;
  let requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode;
  let sdk: AdminSdk;
  let wallet: ethers.Wallet;
  const mnemonic = 'test test test test test test test test test test test junk';

  beforeAll(() => {
    provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    deployer = provider.getSigner();
    wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  });

  beforeEach(async () => {
    airnodeRrp = await new AirnodeRrpV0Factory(deployer).deploy();
    accessControlRegistry = await new AccessControlRegistryFactory(deployer).deploy();
    requesterAuthorizerWithAirnode = await new authorizers.RequesterAuthorizerWithAirnodeFactory(deployer).deploy(
      accessControlRegistry.address,
      'RequesterAuthorizerWithAirnode admin'
    );
    sdk = new AdminSdk(airnodeRrp, requesterAuthorizerWithAirnode);
  });

  it('provides same API', () => {
    expect(airnodeRrp.address).toBeDefined();
    expect(accessControlRegistry.address).toBeDefined();
    expect(requesterAuthorizerWithAirnode.address).toBeDefined();

    const sdkApi = difference(Object.keys(sdk), [
      'airnodeRrp',
      'requesterAuthorizerWithAirnode',
      'parseCliOverrides',
      'parseOverrides',
    ]).sort();
    const sdkStaticApi = difference(Object.keys(AdminSdk), ['airnodeRrp', 'requesterAuthorizerWithAirnode']).sort();
    const adminApi = difference(Object.keys(admin), [
      'deriveWalletPathFromSponsorAddress',
      'deriveEndpointId',
      'parseCliOverrides',
      'parseOverrides',
    ]).sort();

    expect(sdkApi).toEqual(adminApi);
    expect(sdkStaticApi).toEqual([
      'deriveEndpointId',
      'deriveWalletPathFromSponsorAddress',
      'getAirnodeRrp',
      'getRequesterAuthorizerWithAirnode',
      'useAirnodeRrp',
    ]);
  });

  it('starts sponsoring with undefined overrides', async () => {
    const requesterAddress = await sdk.sponsorRequester(wallet.address, undefined);
    expect(requesterAddress).toEqual(wallet.address);
  });

  it('uses transaction overrides', async () => {
    await expect(sdk.sponsorRequester(wallet.address, { gasLimit: 1 })).rejects.toThrow(
      'Transaction requires at least 21572 gas but got 1'
    );
  });
});
