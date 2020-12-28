import { ethers } from 'ethers';
import { InputParameter } from '@airnode/airnode-abi';

// ===========================================
// General
// ===========================================
export interface DeployState {
  readonly apiProvidersByName: { [name: string]: APIProvider };
  readonly authorizersByName: { [name: string]: string };
  readonly clientsByName: { [name: string]: ethers.Contract };
  readonly config: Config;
  readonly contracts: {
    readonly Airnode?: ethers.Contract;
    readonly Convenience?: ethers.Contract;
  };
  readonly deployer: ethers.providers.JsonRpcSigner;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly requestersById: { [name: string]: RequesterAccount };
  readonly templatesByName: { [name: string]: Template };
}

export interface RequestsState {
  readonly config: Config;
  readonly deployment: Deployment;
  readonly deployer: ethers.providers.JsonRpcSigner;
  readonly provider: ethers.providers.JsonRpcProvider;
}

export interface DesignatedWallet {
  readonly address: string;
  readonly apiProviderName: string;
  readonly wallet: ethers.Wallet;
}

export interface RequesterAccount {
  readonly address: string;
  readonly designatedWallets: DesignatedWallet[];
  readonly requesterIndex: ethers.BigNumber;
  readonly signer: ethers.Wallet;
}

export interface APIProvider {
  readonly address: string;
  readonly mnemonic: string;
  readonly signer: ethers.providers.JsonRpcSigner | ethers.Wallet;
  readonly xpub: string;
}

export interface Template {
  readonly apiProviderName: string;
  readonly hash: string;
}

// ===========================================
// Deployment
// ===========================================
export interface DeployedEndpoint {
  readonly endpointId: string;
}

export interface DeployedTemplate {
  readonly endpointId: string;
  readonly hash: string;
}

export interface DeployedAPIProvider {
  readonly address: string;
  readonly endpoints: { [name: string]: DeployedEndpoint };
  readonly templates: { [name: string]: DeployedTemplate };
}

export interface DeployedDesignatedWallet {
  readonly address: string;
  readonly apiProviderName: string;
}

export interface DeployedRequester {
  readonly id: string;
  readonly privateKey: string;
  readonly requesterIndex: string;
}

// Deployment should ideally mirror the structure of the config file, but with
// different fields for addresses, hashes and other deployment data
export interface Deployment {
  readonly apiProviders: { readonly [name: string]: DeployedAPIProvider };
  readonly clients: { readonly [name: string]: string };
  readonly contracts: {
    readonly Airnode: string;
    readonly Convenience: string;
  };
  readonly requesters: DeployedRequester[];
}

// ===========================================
// Configuration
// ===========================================
export interface ConfigClient {
  readonly endorsers: string[];
}

export interface ConfigEndpoint {
  readonly authorizers: string[];
  readonly oisTitle: string;
}

export interface ConfigTemplate {
  readonly endpoint: string;
  readonly fulfillClient: string;
  readonly fulfillFunctionName: string;
  readonly oisTitle: string;
  readonly requester: string;
  readonly parameters: InputParameter[];
}

export interface ConfigAPIProvider {
  readonly mnemonic: string;
  readonly endpoints: { readonly [name: string]: ConfigEndpoint };
  readonly templates: { readonly [name: string]: ConfigTemplate };
}

export interface ConfigRequesterAPIProvider {
  readonly ethBalance: string;
}

export interface ConfigRequester {
  readonly id: string;
  readonly apiProviders: { readonly [name: string]: ConfigRequesterAPIProvider };
}

export type RequestType = 'short' | 'regular' | 'full';

export interface Request {
  readonly apiProvider: string;
  readonly client: string;
  readonly requesterId: string;
  readonly type: RequestType;
}

export interface ShortRequest extends Request {
  readonly parameters: InputParameter[];
  readonly template: string;
}

export interface RegularRequest extends Request {
  readonly fulfillFunctionName: string;
  readonly parameters: InputParameter[];
  readonly template: string;
}

export interface FullRequest extends Request {
  readonly endpoint: string;
  readonly fulfillFunctionName: string;
  readonly parameters: InputParameter[];
}

export interface Config {
  readonly apiProviders: { readonly [name: string]: ConfigAPIProvider };
  readonly authorizers: { readonly [name: string]: string };
  readonly clients: { readonly [name: string]: ConfigClient };
  readonly requesters: ConfigRequester[];
  readonly requests: Array<ShortRequest | RegularRequest | FullRequest>;
}
