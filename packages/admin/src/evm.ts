import { ethers } from 'ethers';
import { AirnodeArtifact, AirnodeAddresses } from '@airnode/protocol';

export async function getAirnode(chain, providerUrl) {
  const provider = providerUrl
    ? new ethers.providers.JsonRpcProvider(providerUrl)
    : ethers.providers.getDefaultProvider(chain);
  const network = await provider.getNetwork();
  return new ethers.Contract(AirnodeAddresses[network.chainId], AirnodeArtifact.abi, provider);
}

export async function getAirnodeWithSigner(mnemonic, chain, providerUrl) {
  const provider = providerUrl
    ? new ethers.providers.JsonRpcProvider(providerUrl)
    : ethers.providers.getDefaultProvider(chain);
  const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  const network = await provider.getNetwork();
  return new ethers.Contract(AirnodeAddresses[network.chainId], AirnodeArtifact.abi, wallet);
}
