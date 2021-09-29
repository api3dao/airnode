import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';
import prompts, { PromptObject } from 'prompts';
import { getUserWallet, IntegrationInfo, runAndHandleErrors } from '../src';

const createOption = (name: string) => ({
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
    choices: readdirSync(join(__dirname, '../integrations'), { withFileTypes: true })
      .filter((integration) => integration.isDirectory())
      .map((integration) => integration.name)
      .map(createOption),
  },
  {
    type: 'select',
    name: 'airnodeType',
    message: 'Choose Airnode type',
    choices: [createOption('local'), createOption('aws')],
  },
  {
    type: 'select',
    name: 'network',
    message: 'Select target blockchain network',
    choices: [createOption('rinkeby'), createOption('localhost')],
  },
  {
    type: 'text',
    name: 'mnemonic',
    message: [
      'Since you chose testnet network, we need an account with testnet funds to connect to the blockchain.',
      '',
      'IMPORTANT: DO NOT ENTER A MNEMONIC LINKED WITH MAINNET ACCOUNTS!!!',
      '',
      'Enter the testnet mnemonic phrase',
    ].join('\n'),
    initial: (_prev, values) =>
      values.network === 'localhost' ? 'test test test test test test test test test test test junk' : '',
  },
  {
    type: 'text',
    name: 'providerUrl',
    message: 'Enter a provider URL',
    initial: (_prev, values) => {
      if (values.network === 'localhost') return 'http://127.0.0.1:8545/';
      if (values.network === 'rinkeby') return 'https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID>';
      return '';
    },
  },
];

const chooseIntegration = async (): Promise<IntegrationInfo> => {
  const response = await prompts(questions);
  return response as IntegrationInfo;
};

const main = async () => {
  const integration = await chooseIntegration();
  writeFileSync(join(__dirname, '../integration-info.json'), JSON.stringify(integration, null, 2));
  console.log(`A file 'integration-info.json' was created!`);

  const wallet = await getUserWallet();
  const balance = ethers.utils.formatEther(await wallet.getBalance());
  console.log(`The account derived from the mnemonic has address: "${wallet.address}" and contains "${balance}" ETH`);
};

runAndHandleErrors(main);
