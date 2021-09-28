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
      'Since you want to deploy on AWS, we need your credentials.',
      '',
      'See video how to create these: https://www.youtube.com/watch?v=KngM5bfpttA',
      '',
      'Specify access key id',
    ].join('\n'),
  },
  {
    type: (_prev, values) => (values.airnodeType === 'aws' ? 'text' : null),
    name: 'secretKey',
    message: 'Specify secret access key',
  },
  {
    type: 'select',
    name: 'network',
    message: 'Choose target network',
    choices: [createOption('rinkeby'), createOption('localhost')],
  },
  {
    type: 'text',
    name: 'mnemonic',
    message: [
      'Since you chose testnet network, we need an account with testnet funds to connect to the blockchain.',
      '',
      'DO NOT USE YOUR REAL WALLET!!!',
      '(create a test only wallet instead)',
      '',
      'Specify the mnemonic of the wallet',
    ].join('\n'),
    initial: (_prev, values) =>
      values.network === 'localhost' ? 'test test test test test test test test test test test junk' : '',
  },
  {
    type: 'text',
    name: 'providerUrl',
    message: 'Specify provider URL',
    initial: (_prev, values) => {
      if (values.network === 'localhost') return 'http://127.0.0.1:8545/';
      if (values.network === 'rinkeby') return 'https://rinkeby.infura.io/v3/<YOUR-KEY>';
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
