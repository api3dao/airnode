import * as fs from 'fs';
import * as dotenv from 'dotenv';
import ora from 'ora';
import { OIS } from '@api3/ois';

// TODO
// I'd say validator would be a better place to keep these types.
// It would make sense for validator to parse the configuration
// file, validate it and return a typed object

export type ChainType = 'evm';

export interface SecurityScheme {
  oisTitle: string;
  name: string;
  envName: string;
}

export type SecuritySchemes = SecurityScheme[];

export interface ChainProvider {
  chainType: ChainType;
  chainId: string;
  name: string;
  envName: string;
}

export type ChainProviders = ChainProvider[];

export interface Environment {
  securitySchemes: SecuritySchemes;
  chainProviders: ChainProviders;
}

export interface NodeSettings {
  nodeVersion: string;
  cloudProvider: 'aws';
  region: string;
  stage: string;
  logFormat?: 'json';
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export interface Chain {
  id: string;
  type: ChainType;
  providerNames: string[];
  contracts: {
    AirnodeRrp: string;
  };
  airnodeAdmin: string;
  authorizers: string[];
  blockHistoryLimit?: number;
  minConfirmations?: number;
  ignoreBlockedRequestsAfterBlocks?: number;
}

export type Chains = Chain[];

export interface Request {
  endpointId: string;
  oisTitle: string;
  endpointName: string;
}

export type Requests = Request[];

export interface Triggers {
  request: Requests;
}

export interface Configuration {
  ois: OIS;
  triggers: Triggers;
  chains: Chains;
  nodeSettings: NodeSettings;
  environment: Environment;
  id: string;
}

export type Configurations = Configuration[];

export function parseConfigFile(configPath: string, nodeVersion: string) {
  let configs: Configurations;
  try {
    configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    ora().fail('Failed to parse secrets file');
    throw e;
  }
  // A more comprehensive validation should be done beforehand
  // https://github.com/api3dao/airnode/issues/136
  for (const config of configs) {
    if (config.nodeSettings.cloudProvider !== 'aws') {
      ora().fail('cloudProvider under nodeSettings in config.json is not aws');
      throw new Error('Attempted to use an unsupported cloud provider');
    }
    if (nodeVersion !== config.nodeSettings.nodeVersion) {
      ora().fail(
        `nodeVersion under nodeSettings in config.json is ${config.nodeSettings.nodeVersion} while the deployer node version is ${nodeVersion}`
      );
      throw new Error('Attempted to deploy node configuration with the wrong node version');
    }
  }
  return configs;
}

export function parseSecretsFile(secretsPath: string) {
  try {
    return dotenv.parse(fs.readFileSync(secretsPath));
  } catch (e) {
    ora().fail('Failed to parse secrets file');
    throw e;
  }
}

export function parseReceiptFile(receiptFilename: string) {
  try {
    return JSON.parse(fs.readFileSync(receiptFilename, 'utf8'));
  } catch (e) {
    ora().fail('Failed to parse receipt file');
    throw e;
  }
}
