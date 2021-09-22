import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import prompts, { PromptObject } from 'prompts';

const createOption = (name: string) => ({
  title: name,
  value: name,
});

const questions: PromptObject[] = [
  {
    type: 'select',
    name: 'integration',
    message: 'Choose integration',
    choices: readdirSync(join(__dirname, '../integrations'))
      .filter((integration) => integration !== 'README.md')
      .map(createOption),
  },
  {
    type: 'select',
    name: 'airnodeType',
    message: 'Choose Airnode type',
    choices: [createOption('containerized'), createOption('aws')],
  },
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
    choices: [createOption('rinkeby'), createOption('hardhat')],
  },
  {
    type: (_prev, values) => (values.network !== 'hardhat' ? 'text' : null),
    name: 'mnemonic',
    message: [
      'Since you chose testnet network, we need an account with testnet funds to connect to the blockchain.',
      '',
      'DO NOT USE YOUR REAL WALLET!!!',
      '(create a test only wallet instead)',
      '',
      'Specify the mnemonic of the wallet',
    ].join('\n'),
  },
  {
    type: (_prev, values) => (values.network !== 'hardhat' ? 'text' : null),
    name: 'providerUrl',
    message: 'Specify provider URL',
  },
];

const chooseIntegration = async () => {
  const response = await prompts(questions);
  return response;
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
