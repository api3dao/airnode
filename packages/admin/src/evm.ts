import { ethers } from 'ethers';
import { AirnodeRrpFactory, AirnodeRrpAddresses } from '@airnode/protocol';

export async function getAirnodeRrp(providerUrl: string) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  return AirnodeRrpFactory.connect(
    AirnodeRrpAddresses[network.chainId]! /** TODO: shouldn't this be defined? */,
    provider
  );
}

export async function getAirnodeRrpWithSigner(mnemonic: string, providerUrl: string) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  const network = await provider.getNetwork();
  return AirnodeRrpFactory.connect(
    AirnodeRrpAddresses[network.chainId]! /** TODO: shouldn't this be defined? */,
    wallet
  );
}
