import { join } from 'path';
import { readFileSync } from 'fs';
import { mockReadFileSync } from '../../test/mock-utils';
import dotenv from 'dotenv';
import { references } from '@api3/airnode-protocol';
import { loadTrustedConfig } from '../index';

const AirnodeRrpV0Addresses: { [chainId: string]: string } = references.AirnodeRrpV0;
const RequesterAuthorizerWithErc721Addresses: { [chainId: string]: string } = references.RequesterAuthorizerWithErc721;

describe('config validation', () => {
  const exampleConfigPath = join(__dirname, '../../config/config.example.json');
  const exampleSecrets = dotenv.parse(readFileSync(join(__dirname, '../../config/secrets.example.env')));

  it('loads the config and adds default contract addresses', () => {
    const chainId = '5';
    const invalidConfig = JSON.parse(readFileSync(exampleConfigPath, 'utf-8'));
    invalidConfig.chains[0].id = chainId; // Need to use an actual chain not hardhat
    delete invalidConfig.chains[0].contracts;
    delete invalidConfig.chains[0].authorizers.crossChainRequesterAuthorizers[0].contracts;
    delete invalidConfig.chains[0].authorizers.crossChainRequesterAuthorizersWithErc721[0].contracts;
    delete invalidConfig.chains[0].authorizers.requesterAuthorizersWithErc721[0].RequesterAuthorizerWithErc721;

    mockReadFileSync('config.example.json', JSON.stringify(invalidConfig));

    const config = loadTrustedConfig(exampleConfigPath, exampleSecrets);

    expect(config.chains[0].contracts.AirnodeRrp).toEqual(AirnodeRrpV0Addresses[chainId]);
    expect(config.chains[0].authorizers.crossChainRequesterAuthorizers[0].contracts.AirnodeRrp).toEqual(
      AirnodeRrpV0Addresses[config.chains[0].authorizers.crossChainRequesterAuthorizers[0].chainId]
    );
    expect(
      config.chains[0].authorizers.crossChainRequesterAuthorizersWithErc721[0].contracts.RequesterAuthorizerWithErc721
    ).toEqual(
      RequesterAuthorizerWithErc721Addresses[
        config.chains[0].authorizers.crossChainRequesterAuthorizersWithErc721[0].chainId
      ]
    );
    expect(config.chains[0].authorizers.requesterAuthorizersWithErc721[0].RequesterAuthorizerWithErc721).toEqual(
      RequesterAuthorizerWithErc721Addresses[config.chains[0].id]
    );
  });
});
