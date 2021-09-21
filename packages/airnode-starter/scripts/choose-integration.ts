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
    choices: [createOption('local'), createOption('serverless')],
  },
];

const chooseIntegration = async () => {
  const response = await prompts(questions);
  return response;
};

async function main() {
  const integration = await chooseIntegration();
  writeFileSync('.integration-info.json', JSON.stringify(integration, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
