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

export async function getAirnodeRequesterRrpAuthorizer(
  providerUrl: string,
  props?: { airnodeRequesterRrpAuthorizerAddress?: string; signer?: { mnemonic: string; derivationPath?: string } }
) {
  let signerOrProvider: ethers.providers.Provider | ethers.Signer = new ethers.providers.JsonRpcProvider(providerUrl);

  const address =
    props?.airnodeRequesterRrpAuthorizerAddress || (await getAirnodeRequesterRrpAuthorizerAddress(signerOrProvider));
  if (!address) throw new Error(`AirnodeRequesterRrpAuthorizer address is not provided`);

  if (props?.signer) {
    signerOrProvider = ethers.Wallet.fromMnemonic(props?.signer.mnemonic, props.signer.derivationPath).connect(
      signerOrProvider
    );
  }

  return authorizers.AirnodeRequesterRrpAuthorizerFactory.connect(address, signerOrProvider);
}
