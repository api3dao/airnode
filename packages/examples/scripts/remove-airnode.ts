import { join } from 'path';
import { cliPrint, readIntegrationInfo, runAndHandleErrors, runShellCommand } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'aws') {
    cliPrint.error('You only need to run this script if you deploy on AWS');
    return;
  }

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  const secretsFilePath = join(__dirname, '../aws.env');
  const deployCommand = [
    `docker run -it --rm`,
    `--env-file ${secretsFilePath}`,
    `-e USER_ID=$(id -u) -e GROUP_ID=$(id -g)`,
    `-v ${integrationPath}:/app/output`,
    `api3/airnode-deployer:latest remove -r output/receipt.json`,
  ].join(' ');

  runShellCommand(deployCommand);
};

runAndHandleErrors(main);
