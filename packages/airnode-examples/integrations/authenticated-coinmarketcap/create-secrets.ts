import { PromptObject } from 'prompts';
import { promptQuestions } from '../../src';
import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const questions: PromptObject[] = [
  {
    type: 'text',
    name: 'apiKey',
    message: [
      'The CoinMarketCap example requires an API key, which can be acquired with a free, Basic account.',
      'Please enter your CoinMarketCap API key',
    ].join('\n'),
  },
];

const createSecrets = async () => {
  const secrets = await getCommonSecrets();
  const response = await promptQuestions(questions);
  secrets.push(`CMC_PRO_API_KEY=${response.apiKey}`);
  writeSecrets(secrets);
};

export default createSecrets;
