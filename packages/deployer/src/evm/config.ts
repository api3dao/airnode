import isArray from 'lodash/isArray';
import mergeWith from 'lodash/mergeWith';
import merge from 'lodash/merge';
import map from 'lodash/map';
import { ChainType } from '@api3/node';
import * as logger from '../utils/logger';
import { Config } from '../types';

type ProviderUrls = {
  [key in ChainType]?: Record<string, string[]>;
};

type AirnodeRrpAddresses = {
  [key in ChainType]?: Record<string, string>;
};

function mergeCustomizer(objValue: any, srcValue: any) {
  if (isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

// TODO
// I'd say that these checks (both from `findProviderUrls` and `findAirnodeRrpAddresses`) should
// be done by the validator in the future

export function findProviderUrls(config: Config) {
  logger.debug('Retrieving provider URLs');
  const providerUrls: ProviderUrls = {};
  for (const configChain of config.chains) {
    const urls = map(configChain.providers, 'url');
    const providerRecord = {
      [configChain.type]: {
        [configChain.id]: urls,
      },
    };
    mergeWith(providerUrls, providerRecord, mergeCustomizer);
  }
  return providerUrls;
}

export function findAirnodeRrpAddresses(config: Config) {
  logger.debug('Checking Airnode RRP addresses');
  const airnodeRrpAddresses: AirnodeRrpAddresses = {};
  for (const configChain of config.chains) {
    const chains = airnodeRrpAddresses[configChain.type];
    if (chains && chains[configChain.id] !== configChain.contracts.AirnodeRrp) {
      throw new Error(`Airnode RRP addresses for chain ${configChain.id} (${configChain.type}) does not match`);
    }

    const airnodeRrsAddressRecord = {
      [configChain.type]: {
        [configChain.id]: configChain.contracts.AirnodeRrp,
      },
    };
    merge(airnodeRrpAddresses, airnodeRrsAddressRecord);
  }
  return airnodeRrpAddresses;
}
