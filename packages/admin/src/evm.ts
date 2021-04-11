import { ethers } from 'ethers';
import { AirnodeRrpFactory, AirnodeRrpAddresses } from '@airnode/protocol';

export async function getAirnodeRrp(providerUrl: string, airnodeRrpAddress = '') {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  const address = airnodeRrpAddress || AirnodeRrpAddresses[network.chainId];

  if (!address) throw new Error(`Invalid AirnodeRrp address: ${address}`);
  return AirnodeRrpFactory.connect(address, provider);
}

export async function getAirnodeRrpWithSigner(
  mnemonic: string,
  derivationPath: string | undefined,
  providerUrl: string,
  airnodeRrpAddress = ''
) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  const address = airnodeRrpAddress || AirnodeRrpAddresses[network.chainId];
  const wallet = ethers.Wallet.fromMnemonic(mnemonic, derivationPath).connect(provider);

  if (!address) throw new Error(`Invalid AirnodeRrp address: ${address}`);
  return AirnodeRrpFactory.connect(address, wallet);
}
