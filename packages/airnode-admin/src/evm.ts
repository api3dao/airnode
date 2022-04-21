import { ethers } from 'ethers';
import {
  AirnodeRrpV0Factory,
  AirnodeRrpAddresses,
  RequesterAuthorizerWithAirnodeAddresses,
  authorizers,
  AirnodeRrpV0,
} from '@api3/airnode-protocol';

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
  if (!address)
    throw new Error(
      `AirnodeRrp address is not provided. Please specify the address using "--airnode-rrp-address" parameter.`
    );

  if (props?.signer) {
    signerOrProvider = ethers.Wallet.fromMnemonic(props.signer.mnemonic, props.signer.derivationPath).connect(
      signerOrProvider
    );
  }
  return AirnodeRrpV0Factory.connect(address, signerOrProvider);
}

export function useAirnodeRrp(airnodeRrpContract: ethers.Contract) {
  return airnodeRrpContract as AirnodeRrpV0;
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
