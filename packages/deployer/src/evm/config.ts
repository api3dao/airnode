export function findProviderUrls(configs, secrets) {
  const providerUrls = {};
  for (const config of configs) {
    for (const configChain of config.chains) {
      for (const providerName of configChain.providerNames) {
        const providerUrlEnvName = config.environment.chainProviders.find(
          (chainProvider) =>
            chainProvider.chainType == configChain.type &&
            chainProvider.chainId == configChain.id &&
            chainProvider.name == providerName
        ).envName;
        if (!providerUrls[configChain.type]) {
          providerUrls[configChain.type] = {};
        }
        if (!providerUrls[configChain.type][configChain.id]) {
          providerUrls[configChain.type][configChain.id] = [];
        }
        providerUrls[configChain.type][configChain.id].push(secrets[providerUrlEnvName]);
      }
    }
  }
  return providerUrls;
}

export function findAirnodeRrpAddresses(configs) {
  const airnodeRrpAddresses = {};
  for (const config of configs) {
    for (const configChain of config.chains) {
      if (!airnodeRrpAddresses[configChain.type]) {
        airnodeRrpAddresses[configChain.type] = {};
      }
      if (!airnodeRrpAddresses[configChain.type][configChain.id]) {
        airnodeRrpAddresses[configChain.type][configChain.id] = configChain.contracts.AirnodeRrp;
      } else if (airnodeRrpAddresses[configChain.type][configChain.id] != configChain.contracts.AirnodeRrp) {
        throw new Error(`Airnode RRP addresses for chain ${configChain.id} (${configChain.type}) does not match`);
      }
    }
  }
  return airnodeRrpAddresses;
}
