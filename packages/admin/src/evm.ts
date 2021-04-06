import { ethers } from 'ethers';
import { AirnodeRrpArtifact, AirnodeRrpAddresses } from '@airnode/protocol';

export async function getAirnodeRrp(providerUrl: string) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  return new ethers.Contract(
    AirnodeRrpAddresses[network.chainId]! /** TODO: shouldn't this be defined? */,
    AirnodeRrpArtifact.abi,
    provider
  );
}

export async function getAirnodeRrpWithSigner(mnemonic: string, providerUrl: string) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  const network = await provider.getNetwork();
  return new ethers.Contract(
    AirnodeRrpAddresses[network.chainId]! /** TODO: shouldn't this be defined? */,
    AirnodeRrpArtifact.abi,
    wallet
  );
}
