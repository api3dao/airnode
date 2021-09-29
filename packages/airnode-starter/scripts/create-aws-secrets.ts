import { writeFileSync } from 'fs';
import { join, relative } from 'path';
import prompts, { PromptObject } from 'prompts';
import { cliPrint, readAwsSecrets, readIntegrationInfo, runAndHandleErrors } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'aws') {
    cliPrint.error('You only need to run this script if you want to deploy Airnode on AWS');
    return;
  }

  const awsSecrets = readAwsSecrets();
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
      initial: awsSecrets.AWS_ACCESS_KEY_ID,
    },
    {
      type: 'text',
      name: 'secretKey',
      message: 'Enter AWS secret access key',
      initial: awsSecrets.AWS_SECRET_KEY,
    },
    {
      type: 'text',
      name: 'sessionToken',
      message: '(Optional) Enter AWS session token',
      initial: awsSecrets.AWS_SESSION_TOKEN,
    },
  ];

  const response = await prompts(questions);
  const airnodeSecrets = [
    `# This file was generated by: ${relative(__dirname, __filename)}`,
    '# ',
    '# For further information see:',
    '# https://docs.api3.org/pre-alpha/guides/provider/deploying-airnode.html#creating-cloud-credentials',
    `AWS_ACCESS_KEY_ID=${response.accessKeyId}`,
    `AWS_SECRET_KEY=${response.secretKey}`,
    `AWS_SESSION_TOKEN=${response.sessionToken}`,
  ];

  writeFileSync(join(__dirname, '../aws.env'), airnodeSecrets.join('\n') + '\n');
  cliPrint.info(`An 'aws.env' file with the required credentials has been created.`);
};

runAndHandleErrors(main);
