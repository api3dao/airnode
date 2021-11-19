import prompts, { PromptObject } from 'prompts';
import { getCommonSecrets, writeSecrets } from '../utils';
import { runAndHandleErrors } from '../../src';

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
  const response = await prompts(questions);
  secrets.push(`CMC_PRO_API_KEY=${response.apiKey}`);
  writeSecrets(secrets);
};

export default createSecrets;

runAndHandleErrors(createSecrets);
