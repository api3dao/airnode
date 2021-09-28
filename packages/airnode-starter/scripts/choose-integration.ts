import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import prompts, { PromptObject } from 'prompts';
import { IntegrationInfo } from '../src';

const createOption = (name: string) => ({
  title: name,
  value: name,
});

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
  // TODO: move AWS secrets to separate script
  {
    type: (_prev, values) => (values.airnodeType === 'aws' ? 'text' : null),
    name: 'accessKeyId',
    message: [
      'In order to deploy to AWS, your access and secret keys are required.',
      'Secrets and keys you enter here will remain on your machine and will not be uploaded anywhere.',
      '',
      'See video how to create these: https://www.youtube.com/watch?v=KngM5bfpttA',
      '',
      'Enter AWS access key ID',
    ].join('\n'),
  },
  {
    type: (_prev, values) => (values.airnodeType === 'aws' ? 'text' : null),
    name: 'secretKey',
    message: 'Enter AWS secret access key',
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

async function main() {
  const integration = await chooseIntegration();
  writeFileSync('integration-info.json', JSON.stringify(integration, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
