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

const createSecrets = async () => {
  const secrets = await getCommonSecrets();
  const response = await promptQuestions(questions);
  secrets.push(`OPENWEATHER_API_KEY=${response.apiKey}`);
  writeSecrets(secrets);
};

export default createSecrets;
