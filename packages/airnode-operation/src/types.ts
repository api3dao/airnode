import { ethers } from 'ethers';
import { InputParameter } from '@api3/airnode-abi';
import { AirnodeRrpV0, AccessControlRegistry, RequesterAuthorizerWithErc721 } from '@api3/airnode-protocol';

// ===========================================
// General
// ===========================================
export interface DeployState {
  readonly airnodesByName: { readonly [name: string]: Airnode };
  readonly authorizersByName: { readonly [name: string]: string };
  readonly requestersByName: { readonly [name: string]: ethers.Contract };
  readonly erc721sByName: { readonly [name: string]: ethers.Contract };
  readonly authorizers: { readonly [name: string]: ethers.Contract };
  readonly config: Config;
  readonly contracts: {
    readonly AirnodeRrp?: AirnodeRrpV0;
    readonly AccessControlRegistry?: AccessControlRegistry;
    readonly RequesterAuthorizerWithErc721?: RequesterAuthorizerWithErc721;
  };
  readonly deployer: ethers.providers.JsonRpcSigner;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly sponsorsById: { readonly [name: string]: SponsorAccount };
  readonly templatesByName: { readonly [name: string]: Template };
}

export interface RequestsState {
  readonly config: Config;
  readonly contracts: {
    readonly AirnodeRrp: AirnodeRrpV0;
  };
  readonly deployment: Deployment;
  readonly deployer: ethers.providers.JsonRpcSigner;
  readonly provider: ethers.providers.JsonRpcProvider;
}

export interface SponsorWallet {
  readonly address: string;
  readonly airnodeName: string;
  readonly wallet: ethers.Wallet;
}

export interface SponsorAccount {
  readonly address: string;
  readonly sponsorWallets: SponsorWallet[];
  readonly signer: ethers.Wallet;
}

export interface Airnode {
  readonly airnodeWalletAddress: string;
  readonly mnemonic: string;
  readonly signer: ethers.providers.JsonRpcSigner | ethers.Wallet;
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
  readonly airnodeWalletAddress: string;
  readonly endpoints: { readonly [name: string]: DeployedEndpoint };
  readonly templates: { readonly [name: string]: DeployedTemplate };
}

export interface DeployedSponsorWallet {
  readonly address: string;
  readonly airnodeName: string;
}

export interface DeployedSponsor {
  readonly address: string;
  readonly id: string;
  readonly privateKey: string;
}

// Deployment should ideally mirror the structure of the config file, but with
// different fields for addresses, hashes and other deployment data
export interface Deployment {
  readonly airnodes: { readonly [name: string]: DeployedAirnode };
  readonly requesters: { readonly [name: string]: string };
  readonly contracts: {
    readonly AirnodeRrp: string;
    readonly RequesterAuthorizerWithErc721: string;
  };
  readonly sponsors: DeployedSponsor[];
  readonly erc721s: { readonly [name: string]: string };
  readonly authorizers: { readonly [name: string]: string };
}

// ===========================================
// Configuration
// ===========================================
export interface ConfigRequester {
  readonly sponsors: string[];
}

export interface ConfigEndpoint {
  readonly oisTitle: string;
}

export interface ConfigTemplate {
  readonly endpoint: string;
  readonly oisTitle: string;
  readonly parameters: InputParameter[];
}

export interface CrossChainConfig {
  readonly requesterEndpointAuthorizers: string[];
  readonly chainType: string;
  readonly chainId: string;
  readonly contracts: {
    readonly AirnodeRrp: string;
  };
  readonly chainProvider: {
    url: string;
  };
}

export interface Erc721CrossChainConfig {
  readonly erc721s: string[];
  readonly chainType: string;
  readonly chainId: string;
  readonly contracts: {
    readonly RequesterAuthorizerWithErc721: string;
  };
  readonly chainProvider: {
    url: string;
  };
}

export interface Erc721Config {
  readonly erc721s: string[];
  readonly RequesterAuthorizerWithErc721: string;
}

export interface ConfigAirnode {
  readonly authorizers: {
    requesterEndpointAuthorizers: string[];
    crossChainRequesterAuthorizers: CrossChainConfig[];
    requesterAuthorizersWithErc721: Erc721Config[];
    crossChainRequesterAuthorizersWithErc721: Erc721CrossChainConfig[];
  };
  readonly authorizations: {
    requesterEndpointAuthorizations: { [endpointId: string]: string[] };
  };
  readonly endpoints: { readonly [name: string]: ConfigEndpoint };
  readonly mnemonic: string;
  readonly templates: { readonly [name: string]: ConfigTemplate };
}

export interface ConfigSponsorAirnode {
  readonly ethBalance: string;
}

export interface ConfigSponsor {
  readonly id: string;
  readonly airnodes: { readonly [name: string]: ConfigSponsorAirnode };
}

export type RequestType = 'template' | 'full' | 'withdrawal';

export interface Request {
  readonly airnode: string;
  readonly sponsorId: string;
  readonly type: RequestType;
}

export interface TemplateRequest extends Request {
  readonly requester: string;
  readonly fulfillFunctionName: string;
  readonly parameters: InputParameter[];
  readonly template: string;
}

export interface FullRequest extends Request {
  readonly requester: string;
  readonly endpoint: string;
  readonly oisTitle: string;
  readonly fulfillFunctionName: string;
  readonly parameters: InputParameter[];
}

export interface Config {
  readonly airnodes: { readonly [name: string]: ConfigAirnode };
  readonly authorizers: { readonly [name: string]: string };
  readonly requesters: { readonly [name: string]: ConfigRequester };
  readonly deployerIndex: number;
  readonly sponsors: ConfigSponsor[];
  readonly requests: Array<TemplateRequest | FullRequest | Request>;
}
