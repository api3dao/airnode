import { ethers } from 'ethers';
import { AirnodeRrpFactory, AirnodeRrpAddresses } from '@airnode/protocol';

async function getAirnodeRrpAddress(provider: ethers.providers.Provider) {
  const network = await provider.getNetwork();
  return AirnodeRrpAddresses[network.chainId];
}

export async function getAirnodeRrp(providerUrl: string, airnodeRrpAddress = '') {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const address = airnodeRrpAddress || (await getAirnodeRrpAddress(provider));

  if (!address) throw new Error(`Invalid AirnodeRrp address`);
  return AirnodeRrpFactory.connect(address, provider);
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

  if (!address) throw new Error(`Invalid AirnodeRrp address`);
  return AirnodeRrpFactory.connect(address, wallet);
}
