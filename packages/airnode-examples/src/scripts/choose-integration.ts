import { spawnSync } from 'child_process';
import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PromptObject } from 'prompts';
import { goSync } from '@api3/promise-utils';
import {
  cliPrint,
  getExistingAirnodeRrpV0,
  IntegrationInfo,
  promptQuestions,
  runAndHandleErrors,
  SameOrCrossChain,
  supportedNetworks,
  writeAddressToDeploymentsFile,
} from '../';

const createCliOption = (name: string) => ({
  title: name,
  value: name,
});

// NOTE: We could add "initial" field with the contents of current integration-info.json, but we already use the
// "initial value" semantics for hinting mnemonic and provider URL.
const questions: PromptObject[] = [
  {
    type: 'select',
    name: 'integration',
    message: 'Choose integration',
    // Every integration is a directory in the 'integrations' folder
    choices: readdirSync(join(__dirname, '../../integrations'), { withFileTypes: true })
      .filter((integration) => integration.isDirectory())
      .map((integration) => integration.name)
      .map(createCliOption),
  },
  {
    type: 'select',
    name: 'airnodeType',
    message: 'Choose Airnode type',
    choices: [createCliOption('aws'), createCliOption('gcp'), createCliOption('local')],
  },
  {
    // Ask this option only if Airnode is to be deployed on GCP
    type: (_prev, values) => {
      return values.airnodeType === 'gcp' ? 'text' : null;
    },
    name: 'gcpProjectId',
    message: 'Enter a GCP project ID',
  },
  {
    type: 'select',
    name: 'network',
    message: 'Select target blockchain network',
    choices: (prev) => {
      const options = supportedNetworks.map(createCliOption);
      // Only allow running on localhost if running Airnode locally
      if (prev === 'local') options.push(createCliOption('localhost'));
      return options;
    },
  },
  {
    type: 'text',
    name: 'mnemonic',
    message: [
      'Since you chose a testnet network, we need an account with testnet funds to connect to the blockchain.',
      '',
      'IMPORTANT: DO NOT ENTER A MNEMONIC LINKED WITH MAINNET ACCOUNTS!!!',
      '',
      'Enter the testnet mnemonic phrase',
    ].join('\n'),
    initial: (_prev, values) =>
      // The default hardhat mnemonic. See: https://hardhat.org/hardhat-network/reference/#config
      values.network === 'localhost' ? 'test test test test test test test test test test test junk' : '',
  },
  {
    type: 'text',
    name: 'providerUrl',
    message: 'Enter a provider URL',
    initial: (_prev, values) => {
      return defaultProviderUrl(values.network);
    },
  },
  {
    // Ask this only for the cross-chain authorizer integration
    type: (_prev, values) => {
      return values.integration === 'coingecko-cross-chain-authorizer' ? 'select' : null;
    },
    name: 'crossChainNetwork',
    message: 'Select second (cross-chain) blockchain network',
    choices: (_prev, values) => {
      const options = supportedNetworks.map(createCliOption);
      // Only allow running on localhost if running Airnode locally
      if (values.airnodeType === 'local') options.push(createCliOption('localhost'));
      return options;
    },
  },
  {
    // Ask this only for the cross-chain authorizer integration
    type: (_prev, values) => {
      return values.integration === 'coingecko-cross-chain-authorizer' ? 'text' : null;
    },
    name: 'crossChainMnemonic',
    message: [
      'Since you chose a testnet network, we need an account with testnet funds to connect to the blockchain.',
      '',
      'IMPORTANT: DO NOT ENTER A MNEMONIC LINKED WITH MAINNET ACCOUNTS!!!',
      '',
      'Enter the testnet mnemonic phrase',
    ].join('\n'),
    initial: (_prev, values) =>
      // The default hardhat mnemonic. See: https://hardhat.org/hardhat-network/reference/#config
      values.network === 'localhost' ? 'test test test test test test test test test test test junk' : '',
  },
  {
    // Ask this only for the cross-chain authorizer integration
    type: (_prev, values) => {
      return values.integration === 'coingecko-cross-chain-authorizer' ? 'text' : null;
    },
    name: 'crossChainProviderUrl',
    message: 'Enter a provider URL for the second (cross-chain) network',
    initial: (_prev, values) => {
      return defaultProviderUrl(values.crossChainNetwork);
    },
  },
];

const defaultProviderUrl = (network: string): string => {
  const getExamplePocketNetwork = (name: string) => `https://eth-${name}.gateway.pokt.network/v1/lb/<APP_ID>`;

  switch (network as IntegrationInfo['network']) {
    case 'localhost':
      // Hardhat network default
      return 'http://127.0.0.1:8545/';
    case 'ethereum-goerli-testnet':
      return getExamplePocketNetwork(network);
    case 'polygon-testnet':
      return `https://polygon-mumbai.g.alchemy.com/v2/`;
    case 'ethereum-sepolia-testnet':
      return 'https://sepolia.infura.io/v3/<INFURA_ID>';
    default:
      return getExamplePocketNetwork(network);
  }
};

/**
 * Ask the user for the integration choice and return them as an object.
 */
const chooseIntegration = async (): Promise<IntegrationInfo> => {
  const response = await promptQuestions(questions);
  return response as IntegrationInfo;
};

/**
 * If git is installed, check if a tag is checked out
 */
const checkGitTag = () => {
  // skip tag check if git is not present
  const gitNotFound =
    spawnSync(`git --version`, {
      shell: true,
    }).status !== 0;

  if (gitNotFound) return;

  const gitTag = spawnSync(`git describe --exact-match --tags`, {
    shell: true,
  });

  if (gitTag.status !== 0)
    cliPrint.warning(`Warning:
    It appears you may not be on a git tag.
    If you directly downloaded the source code at a specific tag or release, please ignore this warning.
    Otherwise, please check out a git tag before proceeding (see README for more details).`);
};

const main = async () => {
  goSync(checkGitTag);
  const integration = await chooseIntegration();

  writeFileSync(join(__dirname, '../../integration-info.json'), JSON.stringify(integration, null, 2));
  cliPrint.info(`A file 'integration-info.json' was created!`);

  // save API3-deployed AirnodeRrpV0 contract address for networks other than localhost
  if (integration.network !== 'localhost') {
    const airnodeAddress = getExistingAirnodeRrpV0(integration.network);
    writeAddressToDeploymentsFile(
      '@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol',
      airnodeAddress,
      SameOrCrossChain.same
    );
  }
};

runAndHandleErrors(main);
