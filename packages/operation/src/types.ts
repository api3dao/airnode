import { ethers } from 'ethers';
import { InputParameter } from '@api3/airnode-abi';
import { AirnodeRrp } from '@api3/protocol';

// ===========================================
// General
// ===========================================
export type DeployState = {
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
};

export type RequestsState = {
  readonly config: Config;
  readonly contracts: {
    readonly AirnodeRrp: AirnodeRrp;
  };
  readonly deployment: Deployment;
  readonly deployer: ethers.providers.JsonRpcSigner;
  readonly provider: ethers.providers.JsonRpcProvider;
};

export type DesignatedWallet = {
  readonly address: string;
  readonly airnodeName: string;
  readonly wallet: ethers.Wallet;
};

export type RequesterAccount = {
  readonly address: string;
  readonly designatedWallets: readonly DesignatedWallet[];
  readonly requesterIndex: ethers.BigNumber;
  readonly signer: ethers.Wallet;
};

export type Airnode = {
  readonly masterWalletAddress: string;
  readonly mnemonic: string;
  readonly signer: ethers.providers.JsonRpcSigner | ethers.Wallet;
  readonly xpub: string;
};

export type Template = {
  readonly airnodeName: string;
  readonly hash: string;
};

// ===========================================
// Deployment
// ===========================================
export type DeployedEndpoint = {
  readonly endpointId: string;
};

export type DeployedTemplate = {
  readonly endpointId: string;
  readonly hash: string;
};

export type DeployedAirnode = {
  readonly masterWalletAddress: string;
  readonly endpoints: { readonly [name: string]: DeployedEndpoint };
  readonly templates: { readonly [name: string]: DeployedTemplate };
};

export type DeployedDesignatedWallet = {
  readonly address: string;
  readonly airnodeName: string;
};

export type DeployedRequester = {
  readonly address: string;
  readonly id: string;
  readonly privateKey: string;
  readonly requesterIndex: string;
};

// Deployment should ideally mirror the structure of the config file, but with
// different fields for addresses, hashes and other deployment data
export type Deployment = {
  readonly airnodes: { readonly [name: string]: DeployedAirnode };
  readonly clients: { readonly [name: string]: string };
  readonly contracts: {
    readonly AirnodeRrp: string;
  };
  readonly requesters: readonly DeployedRequester[];
};

// ===========================================
// Configuration
// ===========================================
export type ConfigClient = {
  readonly endorsers: readonly string[];
};

export type ConfigEndpoint = {
  readonly oisTitle: string;
};

export type ConfigTemplate = {
  readonly endpoint: string;
  readonly oisTitle: string;
  readonly parameters: readonly InputParameter[];
};

export type ConfigAirnode = {
  readonly airnodeAdmin: string;
  readonly authorizers: readonly string[];
  readonly endpoints: { readonly [name: string]: ConfigEndpoint };
  readonly mnemonic: string;
  readonly templates: { readonly [name: string]: ConfigTemplate };
};

export type ConfigRequesterAirnode = {
  readonly ethBalance: string;
};

export type ConfigRequester = {
  readonly id: string;
  readonly airnodes: { readonly [name: string]: ConfigRequesterAirnode };
};

export type RequestType = 'regular' | 'full' | 'withdrawal';

export type Request = {
  readonly airnode: string;
  readonly requesterId: string;
  readonly type: RequestType;
};

export type RegularRequest = Request & {
  readonly client: string;
  readonly fulfillFunctionName: string;
  readonly parameters: readonly InputParameter[];
  readonly template: string;
};

export type FullRequest = Request & {
  readonly client: string;
  readonly endpoint: string;
  readonly fulfillFunctionName: string;
  readonly oisTitle: string;
  readonly parameters: readonly InputParameter[];
};

export type Withdrawal = Request & {
  readonly destination: string;
};

export type Config = {
  readonly airnodes: { readonly [name: string]: ConfigAirnode };
  readonly authorizers: { readonly [name: string]: string };
  readonly clients: { readonly [name: string]: ConfigClient };
  readonly deployerIndex: number;
  readonly requesters: readonly ConfigRequester[];
  readonly requests: ReadonlyArray<RegularRequest | FullRequest | Withdrawal>;
};
