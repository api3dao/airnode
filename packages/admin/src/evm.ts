import { ethers } from 'ethers';
import {
  AirnodeRrpFactory,
  AirnodeRrpAddresses,
  AirnodeRequesterRrpAuthorizerAddresses,
  authorizers,
} from '@api3/protocol';

async function getAirnodeRrpAddress(provider: ethers.providers.Provider) {
  const network = await provider.getNetwork();
  return AirnodeRrpAddresses[network.chainId];
}

async function getAirnodeRequesterRrpAuthorizerAddress(provider: ethers.providers.Provider) {
  const network = await provider.getNetwork();
  return AirnodeRequesterRrpAuthorizerAddresses[network.chainId];
}

export async function getAirnodeRrp(providerUrl: string, airnodeRrpAddress = '') {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const address = airnodeRrpAddress || (await getAirnodeRrpAddress(provider));

  if (!address) throw new Error(`AirnodeRrp address is not provided`);
  return AirnodeRrpFactory.connect(address, provider);
}

export async function getAirnodeRequesterRrpAuthorizer(providerUrl: string, airnodeRequesterRrpAuthorizerAddress = '') {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const address = airnodeRequesterRrpAuthorizerAddress || (await getAirnodeRequesterRrpAuthorizerAddress(provider));

  if (!address) throw new Error(`AirnodeRrp address is not provided`);
  return authorizers.AirnodeRequesterRrpAuthorizerFactory.connect(address, provider);
}

export async function getAirnodeRrpWithSigner(
  mnemonic: string,
  derivationPath: string | undefined,
  providerUrl: string,
  airnodeRrpAddress = ''
) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const address = airnodeRrpAddress || (await getAirnodeRrpAddress(provider));
  const wallet = ethers.Wallet.fromMnemonic(mnemonic, derivationPath).connect(provider);

  if (!address) throw new Error(`AirnodeRrp address is not provided`);
  return AirnodeRrpFactory.connect(address, wallet);
}

export async function getAirnodeRequesterRrpAuthorizerWithSigner(
  mnemonic: string,
  derivationPath: string | undefined,
  providerUrl: string,
  airnodeRequesterRrpAuthorizerAddress = ''
) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const address = airnodeRequesterRrpAuthorizerAddress || (await getAirnodeRequesterRrpAuthorizerAddress(provider));
  const wallet = ethers.Wallet.fromMnemonic(mnemonic, derivationPath).connect(provider);

  if (!address) throw new Error(`AirnodeRequesterRrpAuthorizer address is not provided`);
  return authorizers.AirnodeRequesterRrpAuthorizerFactory.connect(address, wallet);
}
