import { writeFileSync } from 'fs';
import { join, relative } from 'path';
import prompts, { PromptObject } from 'prompts';
import { readIntegrationInfo, runAndHandleErrors } from '../src';

const questions: PromptObject[] = [
  {
    type: 'text',
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
    type: 'text',
    name: 'secretKey',
    message: 'Enter AWS secret access key',
  },
  {
    type: 'text',
    name: 'sessionToken',
    message: '(Optional) Enter AWS session token',
  },
];

async function main() {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'aws') {
    console.log('You only need to run this script if you want to deploy Airnode on AWS');
    return;
  }

  const response = await prompts(questions);
  const airnodeSecrets = [
    `# This file was generated by: ${relative(__dirname, __filename)}`,
    '# ',
    '# For further information see:',
    '# https://docs.api3.org/pre-alpha/guides/provider/deploying-airnode.html#creating-cloud-credentials',
    `AWS_ACCESS_KEY_ID=${response.accessKeyId}`,
    `AWS_SECRET_KEY=${response.secretKey}`,
    `AWS_SESSION_TOKEN==${response.sessionToken}`,
  ];

  writeFileSync(join(__dirname, '../aws.env'), airnodeSecrets.join('\n') + '\n');
  console.log(`An 'aws.env' file with the required credentials has been created.`);
}

runAndHandleErrors(main);
