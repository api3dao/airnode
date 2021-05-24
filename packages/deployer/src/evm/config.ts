import isArray from 'lodash/isArray';
import mergeWith from 'lodash/mergeWith';
import merge from 'lodash/merge';
import { Configurations, ChainType } from '../types';

type ProviderUrls = {
  [key in ChainType]?: Record<string, string[]>;
};

type AirnodeRrrpAddresses = {
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
  const providerUrls: ProviderUrls = {};
  for (const config of configs) {
    for (const configChain of config.chains) {
      for (const providerName of configChain.providerNames) {
        const providerUrlEnvName = config.environment.chainProviders.find(
          (chainProvider) =>
            chainProvider.chainType == configChain.type &&
            chainProvider.chainId == configChain.id &&
            chainProvider.name == providerName
        )!.envName;

        const providerRecord = {
          [configChain.type]: {
            [configChain.id]: [secrets[providerUrlEnvName]],
          },
        };
        mergeWith(providerUrls, providerRecord, mergeCustomizer);
      }
    }
  }
  return providerUrls;
}

export function findAirnodeRrpAddresses(configs: Configurations) {
  const airnodeRrpAddresses: AirnodeRrrpAddresses = {};
  for (const config of configs) {
    for (const configChain of config.chains) {
      const chains = airnodeRrpAddresses[configChain.type];
      if (chains && chains[configChain.id] && chains[configChain.id] != configChain.contracts.AirnodeRrp) {
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
