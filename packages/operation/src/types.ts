import { ethers } from 'ethers';
import { InputParameter } from '@api3/airnode-abi';
import { AirnodeRrp } from '@api3/protocol';

// ===========================================
// General
// ===========================================
export interface DeployState {
  readonly airnodesByName: { readonly [name: string]: Airnode };
  readonly authorizersByName: { readonly [name: string]: string };
  readonly clientsByName: { readonly [name: string]: ethers.Contract };
  readonly config: Config;
  readonly contracts: {
    readonly AirnodeRrp?: AirnodeRrp;
  };
  readonly deployer: ethers.providers.JsonRpcSigner;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly requestersById: { readonly [name: string]: RequesterAccount };
  readonly templatesByName: { readonly [name: string]: Template };
}

export interface RequestsState {
  readonly config: Config;
  readonly contracts: {
    readonly AirnodeRrp: AirnodeRrp;
  };
  readonly deployment: Deployment;
  readonly deployer: ethers.providers.JsonRpcSigner;
  readonly provider: ethers.providers.JsonRpcProvider;
}

export interface DesignatedWallet {
  readonly address: string;
  readonly airnodeName: string;
  readonly wallet: ethers.Wallet;
}

export interface RequesterAccount {
  readonly address: string;
  readonly designatedWallets: DesignatedWallet[];
  readonly signer: ethers.Wallet;
}

export interface Airnode {
  readonly masterWalletAddress: string;
  readonly mnemonic: string;
  readonly signer: ethers.providers.JsonRpcSigner | ethers.Wallet;
  readonly xpub: string;
}

export interface Template {
  readonly airnodeName: string;
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

export interface DeployedAirnode {
  readonly masterWalletAddress: string;
  readonly endpoints: { readonly [name: string]: DeployedEndpoint };
  readonly templates: { readonly [name: string]: DeployedTemplate };
}

export interface DeployedDesignatedWallet {
  readonly address: string;
  readonly airnodeName: string;
}

export interface DeployedRequester {
  readonly address: string;
  readonly id: string;
  readonly privateKey: string;
}

// Deployment should ideally mirror the structure of the config file, but with
// different fields for addresses, hashes and other deployment data
export interface Deployment {
  readonly airnodes: { readonly [name: string]: DeployedAirnode };
  readonly clients: { readonly [name: string]: string };
  readonly contracts: {
    readonly AirnodeRrp: string;
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
  readonly oisTitle: string;
}

export interface ConfigTemplate {
  readonly endpoint: string;
  readonly oisTitle: string;
  readonly parameters: InputParameter[];
}

export interface ConfigAirnode {
  readonly airnodeAdmin: string;
  readonly authorizers: string[];
  readonly endpoints: { readonly [name: string]: ConfigEndpoint };
  readonly mnemonic: string;
  readonly templates: { readonly [name: string]: ConfigTemplate };
}

export interface ConfigRequesterAirnode {
  readonly ethBalance: string;
}

export interface ConfigRequester {
  readonly id: string;
  readonly airnodes: { readonly [name: string]: ConfigRequesterAirnode };
}

export type RequestType = 'regular' | 'full' | 'withdrawal';

export interface Request {
  readonly airnode: string;
  readonly requesterId: string;
  readonly type: RequestType;
}

export interface RegularRequest extends Request {
  readonly client: string;
  readonly fulfillFunctionName: string;
  readonly parameters: InputParameter[];
  readonly template: string;
}

export interface FullRequest extends Request {
  readonly client: string;
  readonly endpoint: string;
  readonly fulfillFunctionName: string;
  readonly oisTitle: string;
  readonly parameters: InputParameter[];
}

export interface Withdrawal extends Request {
  readonly destination: string;
}

export interface Config {
  readonly airnodes: { readonly [name: string]: ConfigAirnode };
  readonly authorizers: { readonly [name: string]: string };
  readonly clients: { readonly [name: string]: ConfigClient };
  readonly deployerIndex: number;
  readonly requesters: ConfigRequester[];
  readonly requests: Array<RegularRequest | FullRequest | Withdrawal>;
}
