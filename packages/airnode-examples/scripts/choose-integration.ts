import { spawnSync } from 'child_process';
import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PromptObject } from 'prompts';
import { cliPrint, IntegrationInfo, isWindows, promptQuestions, runAndHandleErrors } from '../src';

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
    choices: readdirSync(join(__dirname, '../integrations'), { withFileTypes: true })
      .filter((integration) => integration.isDirectory())
      .map((integration) => integration.name)
      .map(createCliOption),
  },
  {
    type: 'select',
    name: 'airnodeType',
    message: 'Choose Airnode type',
    choices: [createCliOption('local'), createCliOption('aws'), createCliOption('gcp')],
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
      const options = ['rinkeby', 'ropsten', 'polygon-mumbai', 'goerli', 'kovan'].map(createCliOption);
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
      // Hardhat network runs by default run on http://127.0.0.1:8545/

      const getExamplePocketNetwork = (name: string) => `https://eth-${name}.gateway.pokt.network/v1/lb/<APP_ID>`;

      switch (values.network) {
        case 'localhost':
          return 'http://127.0.0.1:8545/';
        case 'rinkeby':
        case 'ropsten':
        case 'goerli':
        case 'kovan':
          return getExamplePocketNetwork(values.network);
        case 'polygon-mumbai':
          return `https://polygon-mumbai.g.alchemy.com/v2/`;
        default:
          return '';
      }
    },
  },
];

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
  // skip check on Windows
  if (isWindows()) return;

  // skip tag check if git is not present
  const gitNotFound =
    spawnSync(`command -v git --version`, {
      shell: true,
    }).status === 127;
  if (gitNotFound) return;

  const gitTags = spawnSync(`git describe --tags`, {
    shell: true,
  });

  const notOnTag =
    gitTags.status !== 0 || gitTags.stderr.toString().length > 0 || gitTags.stdout.toString().includes('-');
  if (notOnTag)
    cliPrint.warning(`Warning:
    It appears you may not be on a git tag.
    If you directly downloaded the source code at a specific tag or release, please ignore this warning.
    Otherwise, please check out a git tag before proceeding (see README for more details).`);
};

const main = async () => {
  checkGitTag();
  const integration = await chooseIntegration();
  writeFileSync(join(__dirname, '../integration-info.json'), JSON.stringify(integration, null, 2));
  cliPrint.info(`A file 'integration-info.json' was created!`);
};

runAndHandleErrors(main);
