import { join } from 'path';
import { readIntegrationInfo, runAndHandleErrors, runShellCommand } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'aws') {
    console.log('You only need to run this script if you deploy on AWS');
    return;
  }

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  const secretsFilePath = join(__dirname, '../aws.env');
  const deployCommand = [
    `docker run -it --rm`,
    `--env-file ${secretsFilePath}`,
    `-e USER_ID=$(id -u) -e GROUP_ID=$(id -g)`,
    `-v ${integrationPath}:/app/config`,
    `-v ${integrationPath}/output:/app/output`,
    `api3/deployer:latest deploy`,
  ].join(' ');

  runShellCommand(deployCommand);
  console.log('Airnode deployment successful. See the generated receipt.json for detailed information.');
};

runAndHandleErrors(main);
