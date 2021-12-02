import { PromptObject } from 'prompts';
import { promptQuestions } from '../../src';
import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const questions: PromptObject[] = [
  {
    type: 'text',
    name: 'apiKey',
    message: [
      'The OpenWeather example requires an API key, which can be acquired with a Free account.',
      'Please enter your OpenWeather API key',
    ].join('\n'),
  },
];

const getOpenWeatherApiKey = async (generateExampleFile: boolean) => {
  if (generateExampleFile) return '01b13c3e775e8424c5ee5e7c5a7a956f';
  const response = await promptQuestions(questions);
  return response.apiKey;
};

const createSecrets = async (generateExampleFile = false) => {
  const secrets = await getCommonSecrets(generateExampleFile);
  secrets.push(`OPENWEATHER_API_KEY=${await getOpenWeatherApiKey(generateExampleFile)}`);

  writeSecrets(__dirname, secrets, generateExampleFile);
};

export default createSecrets;
