import { ethers } from 'ethers';
import { AirnodeRrpArtifact, AirnodeRrpAddresses } from '@airnode/protocol';

export async function getAirnodeRrp(providerUrl) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  return new ethers.Contract(AirnodeRrpAddresses[network.chainId], AirnodeRrpArtifact.abi, provider);
}

export async function getAirnodeRrpWithSigner(mnemonic, providerUrl) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  const network = await provider.getNetwork();
  return new ethers.Contract(AirnodeRrpAddresses[network.chainId], AirnodeRrpArtifact.abi, wallet);
}
