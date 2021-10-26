import { ethers } from 'ethers';
import {
  AirnodeRrpFactory,
  AirnodeRrpAddresses,
  RequesterAuthorizerWithAirnodeAddresses,
  authorizers,
} from '@api3/protocol';

async function getAirnodeRrpAddress(provider: ethers.providers.Provider) {
  const network = await provider.getNetwork();
  return AirnodeRrpAddresses[network.chainId];
}

async function getRequesterAuthorizerWithAirnodeAddress(provider: ethers.providers.Provider) {
  const network = await provider.getNetwork();
  return RequesterAuthorizerWithAirnodeAddresses[network.chainId];
}

export async function getAirnodeRrp(
  providerUrl: string,
  props?: { airnodeRrpAddress?: string; signer?: { mnemonic: string; derivationPath?: string } }
) {
  let signerOrProvider: ethers.providers.Provider | ethers.Signer = new ethers.providers.JsonRpcProvider(providerUrl);

  const address = props?.airnodeRrpAddress || (await getAirnodeRrpAddress(signerOrProvider));
  if (!address) throw new Error(`AirnodeRrp address is not provided`);

  if (props?.signer) {
    signerOrProvider = ethers.Wallet.fromMnemonic(props.signer.mnemonic, props.signer.derivationPath).connect(
      signerOrProvider
    );
  }
  return AirnodeRrpFactory.connect(address, signerOrProvider);
}

export async function getRequesterAuthorizerWithAirnode(
  providerUrl: string,
  props?: { requesterAuthorizerWithAirnodeAddress?: string; signer?: { mnemonic: string; derivationPath?: string } }
) {
  let signerOrProvider: ethers.providers.Provider | ethers.Signer = new ethers.providers.JsonRpcProvider(providerUrl);

  const address =
    props?.requesterAuthorizerWithAirnodeAddress || (await getRequesterAuthorizerWithAirnodeAddress(signerOrProvider));
  if (!address) throw new Error(`RequesterAuthorizerWithAirnode address is not provided`);

  if (props?.signer) {
    signerOrProvider = ethers.Wallet.fromMnemonic(props?.signer.mnemonic, props.signer.derivationPath).connect(
      signerOrProvider
    );
  }

  return authorizers.RequesterAuthorizerWithAirnodeFactory.connect(address, signerOrProvider);
}
