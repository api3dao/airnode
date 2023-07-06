import * as fs from 'fs';
import { OIS } from '@api3/ois';
import { randomHexString } from '@api3/airnode-utilities';
import { unsafeParseConfigWithSecrets, parseConfigWithSecrets, config as configTypes } from '@api3/airnode-validator';
import { goSync } from '@api3/promise-utils';

// Accessing specifically the `config` directory so we can export the content of the `config` module not the module itself
export * from '@api3/airnode-validator/dist/src/config';

// TODO: Is this needed?
function parseOises(oises: OIS[]): OIS[] {
  // Assign unique identifiers to each API and Oracle specification.
  return oises.map((ois) => {
    const endpoints = ois.endpoints.map((endpoint) => ({ ...endpoint, id: randomHexString(32) }));

    const apiSpecifications = { ...ois.apiSpecifications, id: randomHexString(32) };
    return { ...ois, apiSpecifications, endpoints };
  });
}

const readConfig = (configPath: string): unknown => {
  const goParse = goSync(() => JSON.parse(fs.readFileSync(configPath, 'utf8')));
  if (!goParse.success) throw new Error('Failed to parse config file');

  return goParse.data;
};

export function addDefaultContractAddresses(config: configTypes.Config): configTypes.Config {
  const ctx = { addIssue: () => {}, path: [] }; // Unused, but required by validator functions
  const chains = config.chains.map((chain) => {
    const { contracts } = configTypes.ensureConfigValidAirnodeRrp(chain, ctx);

    const crossChainRequesterAuthorizers = chain.authorizers.crossChainRequesterAuthorizers.map((craObj) => {
      return configTypes.ensureCrossChainRequesterAuthorizerValidAirnodeRrp(craObj, ctx);
    });

    const crossChainRequesterAuthorizersWithErc721 = chain.authorizers.crossChainRequesterAuthorizersWithErc721.map(
      (craObj) => {
        return configTypes.ensureCrossChainRequesterAuthorizerWithErc721(craObj, ctx);
      }
    );

    return {
      // Add same-chain RequesterAuthorizerWithErc721 contract address, which operates
      // on the entire chain object
      ...configTypes.ensureRequesterAuthorizerWithErc721(
        {
          ...chain,
          contracts,
          authorizers: {
            ...chain.authorizers,
            crossChainRequesterAuthorizers,
            crossChainRequesterAuthorizersWithErc721,
          },
        },
        ctx
      ),
    };
  });

  return { ...config, chains };
}

export function loadConfig(configPath: string, secrets: Record<string, string | undefined>) {
  const rawConfig = readConfig(configPath);
  const parsedConfigRes = parseConfigWithSecrets(rawConfig, secrets);
  if (!parsedConfigRes.success) {
    throw new Error(`Invalid Airnode configuration file: ${parsedConfigRes.error}`);
  }

  const config = parsedConfigRes.data;
  return config;
}

export function loadTrustedConfig(configPath: string, secrets: Record<string, string | undefined>): configTypes.Config {
  const rawConfig = readConfig(configPath);
  const parsedConfig = unsafeParseConfigWithSecrets(rawConfig, secrets);
  const config = addDefaultContractAddresses(parsedConfig);
  const ois = parseOises(config.ois);
  return { ...config, ois };
}

export function getMasterKeyMnemonic(config: configTypes.Config): string {
  const mnemonic = config.nodeSettings.airnodeWalletMnemonic;
  // The node cannot function without a master mnemonic
  if (!mnemonic) {
    throw new Error('Unable to find Airnode wallet mnemonic in the configuration. Please ensure this is set first');
  }
  return mnemonic;
}

export function getEnvValue(envName: string) {
  return process.env[envName];
}

export function setEnvValue(envName: string, envValue: string) {
  // eslint-disable-next-line functional/immutable-data
  process.env[envName] = envValue;
}

export function getAirnodeWalletPrivateKey() {
  const airnodeWalletPrivateKey = getEnvValue('AIRNODE_WALLET_PRIVATE_KEY');
  if (!airnodeWalletPrivateKey) {
    throw new Error('Missing Airnode wallet private key in environment variables.');
  }
  return airnodeWalletPrivateKey;
}
