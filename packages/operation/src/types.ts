import { ethers } from 'ethers';

export interface DeployState {
  readonly apiProvidersByName: { [name: string]: APIProvider };
  readonly authorizersByName: { [name: string]: string };
  readonly clientsByName: { [name: string]: ethers.Contract };
  // TODO
  readonly config: any;
  readonly contracts: {
    readonly Airnode?: ethers.Contract;
    readonly Convenience?: ethers.Contract;
  };
  readonly deployer: ethers.providers.JsonRpcSigner;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly requestersById: { [name: string]: RequesterAccount };
  readonly templatesByName: { [name: string]: Template };
}

export interface DesignatedWallet {
  readonly address: string;
  readonly apiProviderName: string;
  readonly wallet: ethers.Wallet;
}

export interface RequesterAccount {
  readonly address: string;
  readonly designatedWallets: DesignatedWallet[];
  readonly requesterIndex: string;
  readonly signer: ethers.providers.JsonRpcSigner | ethers.Wallet;
}

export interface APIProvider {
  readonly address: string;
  readonly mnemonic: string;
  readonly signer: ethers.providers.JsonRpcSigner | ethers.Wallet;
  readonly xpub: string;
}

export interface Template {
  readonly apiProviderName: string;
  readonly onchainTemplateId: string;
}
