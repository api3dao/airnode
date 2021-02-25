import { ethers } from 'ethers';
import { AirnodeArtifact, AirnodeAddresses } from '@airnode/protocol';

export async function getAirnode(providerUrl) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  return new ethers.Contract(AirnodeAddresses[network.chainId], AirnodeArtifact.abi, provider);
}

export async function getAirnodeWithSigner(mnemonic, providerUrl) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  const network = await provider.getNetwork();
  return new ethers.Contract(AirnodeAddresses[network.chainId], AirnodeArtifact.abi, wallet);
}
