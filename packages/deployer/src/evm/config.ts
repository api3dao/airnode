import isArray from 'lodash/isArray';
import mergeWith from 'lodash/mergeWith';
import merge from 'lodash/merge';
import { Configurations, ChainType } from '../types';
import * as logger from '../utils/logger';

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

export function findProviderUrls(configs: Configurations, secrets: Record<string, string>) {
  logger.debug('Retrieving provider URLs');
  const providerUrls: ProviderUrls = {};
  for (const config of configs) {
    for (const configChain of config.chains) {
      for (const providerName of configChain.providerNames) {
        const chainProvider = config.environment.chainProviders.find(
          (chainProvider) =>
            chainProvider.chainType === configChain.type &&
            chainProvider.chainId === configChain.id &&
            chainProvider.name === providerName
        );
        if (!chainProvider) {
          throw new Error(`Can\'t find chain provider environment data for ${providerName}`);
        }

        const providerRecord = {
          [configChain.type]: {
            [configChain.id]: [secrets[chainProvider.envName]],
          },
        };
        mergeWith(providerUrls, providerRecord, mergeCustomizer);
      }
    }
  }
  return providerUrls;
}

export function findAirnodeRrpAddresses(configs: Configurations) {
  logger.debug('Checking Airnode RRP addresses');
  const airnodeRrpAddresses: AirnodeRrpAddresses = {};
  for (const config of configs) {
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
  }
  return airnodeRrpAddresses;
}
