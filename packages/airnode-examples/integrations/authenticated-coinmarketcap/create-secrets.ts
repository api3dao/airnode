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

const getCoinMarketCapApiKey = async (generateExampleFile: boolean) => {
  if (generateExampleFile) return '6fc6292d-a355-4046-88fd-bfab6892baf1';
  const response = await promptQuestions(questions);
  return response.apiKey;
};

const createSecrets = async (generateExampleFile = false) => {
  const secrets = await getCommonSecrets(generateExampleFile);
  secrets.push(`CMC_PRO_API_KEY=${await getCoinMarketCapApiKey(generateExampleFile)}`);

  writeSecrets(__dirname, secrets, generateExampleFile);
};

export default createSecrets;
